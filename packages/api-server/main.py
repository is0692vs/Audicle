from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import subprocess
import json
import os
import logging
import re
from typing import List
import aiofiles
from google.api_core.exceptions import GoogleAPICallError, RetryError
from google.cloud import texttospeech

# ログ設定
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = FastAPI(title="Audicle API Server", version="1.0.0")

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Google Cloud TTS クライアント
_client: texttospeech.TextToSpeechClient = None


def _get_client() -> texttospeech.TextToSpeechClient:
    """Lazily instantiate the Google Cloud TTS client."""
    global _client

    if _client is not None:
        return _client

    credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if not credentials_path:
        raise RuntimeError(
            "GOOGLE_APPLICATION_CREDENTIALS environment variable is not set."
        )

    if not os.path.exists(credentials_path):
        raise RuntimeError(
            f"Credentials file not found at '{credentials_path}'."
        )

    logger.info("Initialising Google Cloud Text-to-Speech client")
    _client = texttospeech.TextToSpeechClient()
    return _client


# Request models
class ExtractRequest(BaseModel):
    url: str


class SynthesizeRequest(BaseModel):
    text: str
    voice: str = os.getenv("DEFAULT_VOICE", "ja-JP-Neural2-B")


# Response models
class ExtractResponse(BaseModel):
    title: str
    chunks: List[str]


# Google Cloud TTS APIの最大リクエストバイト数
MAX_TTS_BYTES = 5000


def _split_text(text: str) -> List[str]:
    """テキストをGoogle Cloud TTS APIの制限内に分割する"""
    chunks = []
    current_chunk = ""
    # 。、！、？、\nなどで分割
    sentences = [s for s in re.split(r'([。！？\n])', text) if s]

    # 句読点を前の文に結合
    i = 0
    while i < len(sentences) - 1:
        if sentences[i+1] in '。！？':
            sentences[i] += sentences[i+1]
            del sentences[i+1]
        else:
            i += 1

    for sentence in sentences:
        if len((current_chunk + sentence).encode('utf-8')) > MAX_TTS_BYTES:
            if current_chunk:
                chunks.append(current_chunk)
            current_chunk = sentence
        else:
            current_chunk += sentence

    if current_chunk:
        chunks.append(current_chunk)

    # 1文が5000バイトを超える場合の処理
    final_chunks = []
    for chunk in chunks:
        if len(chunk.encode('utf-8')) > MAX_TTS_BYTES:
            # さらに句読点「、」で分割
            sub_sentences = [s for s in re.split(r'(、)', chunk) if s]

            # 句読点を前の文に結合
            i = 0
            while i < len(sub_sentences) - 1:
                if sub_sentences[i+1] == '、':
                    sub_sentences[i] += sub_sentences[i+1]
                    del sub_sentences[i+1]
                else:
                    i += 1

            sub_chunk = ""
            for s in sub_sentences:
                if len((sub_chunk + s).encode('utf-8')) > MAX_TTS_BYTES:
                    if sub_chunk:
                        final_chunks.append(sub_chunk)
                    sub_chunk = s
                else:
                    sub_chunk += s
            if sub_chunk:
                final_chunks.append(sub_chunk)
        else:
            final_chunks.append(chunk)

    return final_chunks


async def _synthesize_to_bytes(text: str, voice: str) -> bytes:
    client = _get_client()

    synthesis_input = texttospeech.SynthesisInput(text=text)

    voice_params = texttospeech.VoiceSelectionParams(
        language_code="ja-JP",
        name=voice,
    )

    # 環境変数から再生速度を取得（デフォルト: 2.0倍速）
    speaking_rate = float(os.getenv("TTS_SPEAKING_RATE", "2.0"))

    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3,
        speaking_rate=speaking_rate,
    )

    def _call_api() -> bytes:
        response = client.synthesize_speech(
            input=synthesis_input,
            voice=voice_params,
            audio_config=audio_config,
        )
        return response.audio_content

    try:
        return await asyncio.to_thread(_call_api)
    except (GoogleAPICallError, RetryError) as exc:
        logger.error("Google Cloud TTS API error: %s", exc)
        raise HTTPException(
            status_code=502,
            detail=f"Google Cloud TTS error: {exc}"
        )
    except Exception as exc:
        logger.error("Unexpected synthesis error: %s", exc)
        raise HTTPException(status_code=500, detail=f"Unexpected error: {exc}")


@app.get("/")
async def root():
    return {"message": "Audicle API Server is running", "version": "1.0.0"}


@app.post("/extract", response_model=ExtractResponse)
async def extract_content(request: ExtractRequest):
    """URLから本文を抽出する"""
    try:
        # Node.jsスクリプトを実行してReadability.jsで本文抽出
        result = subprocess.run(
            ["node", "readability_script.js", request.url],
            capture_output=True,
            text=True,
            timeout=30
        )

        if result.returncode != 0:
            raise HTTPException(
                status_code=400,
                detail=f"Extraction failed: {result.stderr}"
            )

        # JSONレスポンスをパース
        extracted_data = json.loads(result.stdout)

        return ExtractResponse(
            title=extracted_data.get("title", ""),
            chunks=extracted_data.get("chunks", [])
        )

    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="Extraction timeout")
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail="Failed to parse extraction result"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@app.post("/synthesize")
async def synthesize_speech(request: SynthesizeRequest):
    """テキストを音声化してMP3を返す"""
    try:
        logger.info(f"Synthesizing text: {request.text[:100]}...")
        logger.info(f"Using voice: {request.voice}")

        text_chunks = _split_text(request.text)
        logger.info(f"Split text into {len(text_chunks)} chunks")

        audio_chunks = []
        for i, chunk in enumerate(text_chunks):
            logger.info(f"Synthesizing chunk {i+1}/{len(text_chunks)}")
            audio_chunk = await _synthesize_to_bytes(chunk, request.voice)
            audio_chunks.append(audio_chunk)

        full_audio = b"".join(audio_chunks)

        return Response(
            content=full_audio,
            media_type="audio/mpeg",
            headers={"Content-Disposition": "attachment; filename=speech.mp3"}
        )

    except Exception as e:
        logger.error(f"Synthesis error: {str(e)}")

        # フォールバック処理
        try:
            logger.info("Attempting fallback: returning test audio file")

            fallback_path = "fallback.mp3"
            if os.path.exists(fallback_path):
                async with aiofiles.open(fallback_path, "rb") as fallback_file:
                    fallback_audio = await fallback_file.read()

                content_disposition = "attachment; filename=fallback.mp3"
                return Response(
                    content=fallback_audio,
                    media_type="audio/mpeg",
                    headers={
                        "Content-Disposition": content_disposition,
                        "X-Fallback": "true",
                        "X-Error": str(e)
                    }
                )
            else:
                logger.warning(
                    "Fallback audio file not found, returning empty response"
                )
                content_disposition_empty = "attachment; filename=empty.mp3"
                return Response(
                    content=b"",
                    media_type="audio/mpeg",
                    headers={
                        "Content-Disposition": content_disposition_empty,
                        "X-Fallback": "true",
                        "X-Error": str(e)
                    }
                )

        except Exception as fallback_error:
            logger.error(f"Fallback also failed: {str(fallback_error)}")
            raise HTTPException(
                status_code=500,
                detail=(
                    f"Synthesis failed: {str(e)}. "
                    f"Fallback failed: {str(fallback_error)}"
                )
            )


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
