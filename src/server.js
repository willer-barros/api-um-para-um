import express from "express";
import cors from "cors"
import { prisma } from "./lib/prisma.ts";
import morgan from "morgan"
import argon2 from "argon2"
import jwt from "jsonwebtoken"
import { verificarToken } from "./middleware/authMiddleware.js";

const SECRET_KEY = process.env.JWT_SECRET || "chave_chupa_cabra";
const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET || "chave_chupa_cabra";
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || "chave_chupa_cabra";


const app = express()
const PORT = 3000
app.use(express.json())
app.use(cors())
app.use(morgan("dev"))

app.use((req, res, next) =>{
    console.log(`\n------------------------------`);
    next()
});
// rota para registrar usuario usando ARGON2id
app.post('/api/refresh', async (req, res) => {
  try {
    const { tokenDeRenovacao } = req.body; // Vamos receber o refreshToken pelo corpo da requisição

    if (!tokenDeRenovacao) {
      return res.status(401).json({ erro: "Refresh Token não fornecido." });
    }

    // 1. Verifica se o Refresh Token é matematicamente válido
    const dadosVerificados = jwt.verify(tokenDeRenovacao, REFRESH_SECRET);

    // 2. Busca o usuário no banco para checar se esse token realmente pertence a ele
    const usuario = await prisma.usuario.findUnique({
      where: { id: dadosVerificados.id }
    });

    // Se o token foi alterado ou se o usuário já deslogou e o token no banco mudou
    if (!usuario || usuario.refreshToken !== tokenDeRenovacao) {
      return res.status(403).json({ erro: "Refresh token inválido ou revogado." });
    }

    // 3. Se tudo estiver OK, geramos um NOVO Access Token zerado de 15 minutos!
    const novoPayload = { id: usuario.id, email: usuario.email };
    const novoAccessToken = jwt.sign(novoPayload, ACCESS_SECRET, { expiresIn: '15m' });

    console.log(`✅ [API] Access Token renovado com sucesso via Refresh Token para o usuário ${usuario.nome}`);

    return res.json({
      accessToken: novoAccessToken
    });

  } catch (error) {
    // Se o refresh token de 30 dias também expirar (raro, mas acontece)
    return res.status(403).json({ erro: "Sessão totalmente expirada. Faça login novamente." });
  }
});



//rota para login
app.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    
    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario) return res.status(401).json({ erro: "Credenciais inválidas." });

    const senhaCorreta = await argon2.verify(usuario.senha, senha);
    if (!senhaCorreta) return res.status(401).json({ erro: "Credenciais inválidas." });

    // Dados que vão dentro dos tokens
    const payload = { id: usuario.id, email: usuario.email };

    // 1. Gera o Access Token (Curto: para os testes rápidos, coloque '1m' ou '15m')
    const accessToken = jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m' });

    // 2. Gera o Refresh Token (Longo: 30 dias)
    const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: '30d' });

    // 3. Salva o Refresh Token no banco de dados para validação futura
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { refreshToken: refreshToken }
    });

    // 4. Retorna AMBOS para o cliente
    return res.json({
      accessToken,
      refreshToken,
      usuario: { id: usuario.id, nome: usuario.nome }
    });

  } catch (error) {
    return res.status(500).json({ erro: "Erro no login" });
  }
});

app.post("/api/refresh", verificarToken, async (req, res) => {
  try {
    const usuarioId = req.usuarioLogadoId;

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId }
    });

    if (!usuario) {
      return res.status(401).json({ erro: "Usuário não encontrado." });
    }

    const payload = { id: usuario.id, email: usuario.email };
    const novoToken = jwt.sign(payload, SECRET_KEY, { expiresIn: '30d' });

    console.log(`🔄 [API] Token renovado com sucesso para o ID: ${usuario.id}`);

    return res.json({ token: novoToken });

  } catch (error) {
    return res.status(500).json({ erro: "Erro ao atualizar sessão." });
  }
});

app.get("/usuarios", verificarToken, async (req, res) => {
    console.log(`🔍 [API] Buscando todos os usuários no banco de dados...`);
    try {

        const usuarioLogado = req.usuarioLogadoId
        const usuarios = await prisma.usuario.findMany();
        console.log(`✅ [API] Busca realizada com sucesso. Total: ${usuarios.length} usuários.`);
        res.json(usuarios);
    } catch (error) {
        console.error(`❌ [API Erro] Falha ao buscar usuários:`, error.message);
        res.status(500).json({ error: "Erro ao buscar usuarios" });
    }
});

app.post("/usuarios", async (req, res) => {
    console.log(`📥 [API] Recebendo dados para criar um novo usuário...`);
    try {
        const { email, senha, bio, fotoUrl } = req.body;
        
        const novoUsuario = await prisma.usuario.create({
            data: {
                email,
                senha,
                perfil: {
                    create: { bio, fotoUrl }
                }
            },
            include: { perfil: true }
        });
        
        console.log(`✅ [API] Usuário criado com sucesso! ID: ${novoUsuario.id}`);
        res.status(201).json(novoUsuario); 
    } catch (error) {
        console.error("❌ [API Erro] Erro completo do Prisma:", error.message || error);
        res.status(400).json({ 
            erro: "Erro ao criar usuario", 
            detalhe: error.message || error
        });
    }
});

app.put("/usuarios/:id", async (req, res) => {
    const { id } = req.params;
    console.log(`🔄 [API] Substituição total (PUT) solicitada para o ID: ${id}`);
    try {
        const { email, senha, bio, fotoUrl } = req.body;

        const usuarioAtualizado = await prisma.usuario.update({
            where: { id: Number(id) },
            data: {
                email,
                senha,
                perfil: {
                    upsert: {
                        create: { bio, fotoUrl },
                        update: { bio, fotoUrl }
                    }
                }
            },
            include: { perfil: true }
        });

        console.log(`✅ [API] Usuário ${id} totalmente atualizado via Upsert.`);
        res.json(usuarioAtualizado);
    } catch (error) {
        console.error(`❌ [API Erro] Falha no PUT do usuário ${id}:`, error.message);
        res.status(400).json({ erro: "Erro ao atualizar ususario", detalhe: error.message });
    }
});

app.patch("/usuarios/:id", async (req, res) => {
    const { id } = req.params;
    console.log(`🩹 [API] Modificação parcial (PATCH) solicitada para o ID: ${id}`);
    try {
        const { email, senha, bio, fotoUrl } = req.body;

        const dadosAtualizacao = {
            email,
            senha,
            perfil: (bio || fotoUrl) ? {
                update: { bio, fotoUrl }
            } : undefined
        };

        Object.keys(dadosAtualizacao).forEach(key => dadosAtualizacao[key] === undefined && delete dadosAtualizacao[key]);

        const usuario = await prisma.usuario.update({
            where: { id: Number(id) },
            data: dadosAtualizacao,
            include: { perfil: true }
        });

        console.log(`✅ [API] Campos do usuário ${id} atualizados com sucesso.`);
        res.json(usuario);
    } catch (error) {
        console.error(`❌ [API Erro] Falha no PATCH do usuário ${id}:`, error.message);
        res.status(400).json({ erro: "Erro ao atualizar parcialmente", detalhe: error.message });
    }
});

app.delete("/usuarios/:id", async (req, res) => {
    const { id } = req.params;
    console.log(`🗑️ [API] Solicitação para deletar o usuário ID: ${id}`);
    try {
        await prisma.usuario.delete({
            where: { id: Number(id) }
        });

        console.log(`✅ [API] Usuário ${id} removido do banco de dados.`);
        res.status(204).send();
    } catch (error) {
        console.error(`❌ [API Erro] Falha ao deletar o usuário ${id}:`, error.message);
        res.status(400).json({ erro: "Erro ao deletar usuario", detalhe: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`❌​1️⃣​8️⃣​ API para Maiores rodando em: http://localhost:${PORT}`);
});
