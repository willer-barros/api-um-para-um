import jwt from "jsonwebtoken";

// 🔐 IMPORTANTE: O middleware precisa usar a MESMA chave de acesso usada no login!
const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET || "chave_chupa_cabra_acesso";

export function verificarToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ erro: "Token não fornecido." });
    }

    // Divide a string "Bearer <TOKEN>" para pegar apenas o código do token
    const partes = authHeader.split(" ");
    if (partes.length !== 2 || partes[0] !== "Bearer") {
        return res.status(401).json({ erro: "Token mal formatado." });
    }

    const token = partes[1];

    try {
        // 🔄 Aqui estava o problema: mudamos de SECRET_KEY para ACCESS_SECRET
        const dadosDecodificados = jwt.verify(token, ACCESS_SECRET);
        
        // Salva o ID do usuário na requisição para as rotas usarem se precisarem
        req.usuarioLogadoId = dadosDecodificados.id;
        
        return next(); // Libera para a rota (ex: GET /usuarios)
    } catch (error) {
        return res.status(401).json({ erro: "Token inválido ou expirado." });
    }
}