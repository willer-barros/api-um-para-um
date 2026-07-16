import express from "express";
import cors from "cors"
import { prisma } from "./lib/prisma.ts";
import morgan from "morgan"
import argon2 from "argon2"
import jwt from "jsonwebtoken"
import { verificarToken } from "./middleware/authMiddleware.js";

const SECRET_KEY = process.env.JWT_SECRET || "chave_chupa_cabra";


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
app.post("/register", async (req, res) =>{
    const {nome, email, senha} = req.body;
    try{
    if(!nome || !email || !senha){
        return res.status(400).json({erro: "Todos os campos são obrigatorios"})

    }

    const emailExiste = await prisma.usuario.findUnique({where: {email}})
    if(emailExiste){
        return res.status(409).json({erro: "Este email ja esta cadastrado"})
    }

    //geracao do hash na senha com argon2Id

    const senhaHash = await argon2.hash(senha, {
        type: argon2.argon2id, //garante o algoritmo hibrido correto
        memoryCost: 2 ** 16, //64MB de memoria para processar PADRAO
        timeCost: 3, //3 iteracoes
    })

    const novoUsuario = await prisma.usuario.create({
        data:{
            nome,
            email,
            senha: senhaHash
        },
        select: {id: true, nome: true, email: true}
    })

    return res.status(201).json(novoUsuario)
} catch(error){
    return res.status(400).json({erro: "Erro ao registrar novo usuario"})
}
})

//rota para login
app.post("/login", async (req, res) =>{
    const {email, senha } = req.body;

    if(!email || !senha){
        return res.status(400).json({erro: "Email e senha sao obrigatorios"})
    }

    const usuario = await prisma.usuario.findUnique({where: {email}})
    if (!usuario){
        return res.status(401).json({ erro: "Email ou senha invalidos"})
    }

    //Verifica se a senha enviada confere com a que esta no DB

    const senhaCorreta = await argon2.verify(usuario.senha, senha)

    if(!senhaCorreta){
        return res.status(401).json({error: "Email ou senha invalidos"})
    }

    const payload = {id: usuario.id, email: usuario.email};
    const token = jwt.sign(payload, SECRET_KEY, {expiresIn: '10m'})

    return res.json({
        token, 
        usuario: {id: usuario.id, nome: usuario.nome, email: usuario.email}
    })
})

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
    const novoToken = jwt.sign(payload, SECRET_KEY, { expiresIn: '10m' });

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
