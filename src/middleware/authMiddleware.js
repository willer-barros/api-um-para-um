import jwt from 'jsonwebtoken';

// 🚨 IMPORTANTE: Use a mesma chave secreta que você utilizou para gerar o token no Login!
const SECRET_KEY = process.env.JWT_SECRET || "chave_super_secreta_senai_que_ninguem_deve_saber";

export const verificarToken = (req, res, next) => {
  // 1. Busca o cabeçalho de autorização da requisição
  const authHeader = req.headers['authorization'];
  
  // O padrão de mercado envia o token no formato: "Bearer <TOKEN_AQUI>"
  // O .split(' ')[1] serve para ignorar a palavra "Bearer" e pegar apenas o token.
  const token = authHeader && authHeader.split(' ')[1];

  // 2. Se o token não for enviado, barra na hora (Status 401 - Unauthorized)
  if (!token) {
    return res.status(401).json({ erro: "Acesso negado. Token não fornecido." });
  }

  try {
    // 3. Tenta decodificar e validar o token com a nossa chave secreta
    const usuarioVerificado = jwt.verify(token, SECRET_KEY);

    // 4. Se a validação passou, "injetamos" o ID do usuário dentro do objeto `req`
    // Assim, todas as rotas que usarem esse middleware saberão quem é o usuário logado
    req.usuarioLogadoId = usuarioVerificado.id;

    // 5. Autoriza a requisição a seguir viagem para a rota final
    next();
  } catch (error) {
    // Se o token for falso, alterado ou se já tiver EXPIRADO (Status 403 - Forbidden)
    return res.status(403).json({ erro: "Token inválido ou expirado." });
  }
};