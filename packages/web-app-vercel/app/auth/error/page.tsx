export default function AuthError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600">
            アクセスが拒否されました
          </h2>
          <p className="mt-4 text-gray-600">
            このアプリは許可されたユーザーのみ利用できます．
          </p>
        </div>
      </div>
    </div>
  );
}
