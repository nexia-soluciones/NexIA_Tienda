import Link from "next/link";
import LoginForm from "./auth/login/LoginForm";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">NexIA Tienda</h1>
          <p className="text-gray-500 text-sm mt-1">Inicia sesión para continuar</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <LoginForm />
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          ¿Aún no tienes tienda?{" "}
          <Link href="/registro" className="text-blue-600 hover:underline font-medium">
            Créala gratis
          </Link>
        </p>
      </div>
    </div>
  );
}
