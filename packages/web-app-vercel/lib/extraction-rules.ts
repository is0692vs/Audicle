// サイト別カスタム解析ルールの型定義

export interface ExtractionRule {
    domain: string;
    name: string;
    description: string;
    selectors?: {
        title?: string;
        content?: string;
        author?: string;
        publishDate?: string;
    };
    preprocess?: (doc: Document) => void;
    postprocess?: (content: string) => string;
}

export interface ExtractionRulesMap {
    [domain: string]: ExtractionRule;
}

/**
 * サイト別カスタムルールの管理クラス
 * 将来的には具体的なサイト（Qiita, note, etc.）のルールを登録する
 */
export class ExtractionRulesManager {
    private rules: ExtractionRulesMap = {};

    /**
     * URLに対応するカスタムルールを取得
     */
    getRule(url: string): ExtractionRule | null {
        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname.replace('www.', '');
            return this.rules[domain] || null;
        } catch {
            return null;
        }
    }

    /**
     * カスタムルールを登録
     */
    registerRule(rule: ExtractionRule): void {
        this.rules[rule.domain] = rule;
    }

    /**
     * 全ルールを取得
     */
    getAllRules(): ExtractionRulesMap {
        return { ...this.rules };
    }
}

// グローバルインスタンス
export const extractionRulesManager = new ExtractionRulesManager();
