import express from "express";
import cors from "cors"
import { prisma } from "./lib/prisma.ts";


const app = express()
const PORT = 3000
app.use(express.json())
app.use(cors())

app.get("/usuarios", async(req, res) =>{
    try{
        const usuarios = await prisma.usuario.findMany()
        res.json(usuarios)

    } catch(error){
        res.status(500).json({error: "Erro ao buscar usuarios"})
    }
})

app.post("/usuaios", async(req, res) =>{

    try{
    const {email, senha, bio, fotoUrl} = req.body
    const novoUsuario = await usuario.create({
        data:{
            email,
            senha,
            perfil:{
                create:{
                    bio,
                    fotoUrl
                }
            }
        },
        include: {perfil: true}
    })
    res.status(201).json(novoUsuario)
    } catch(error){
        res.status(400).json({ erro: "Erro ao criar usuario", detalhe: error.message})
    }
});

//esse atualiza tudo
app.put("/usuarios/:id", async(req, res) =>{
    try{
        const {id} = req.params
        const {email, senha, bio, fotoUrl} = req.body

        const usuarioAtualizado = await prisma.usuario.update({
            where: {id: Number(id)},
            data: {
                email,
                senha,
                perfil:{
                    upsert:{
                        create: {bio, fotoUrl},
                        update: {bio, fotoUrl}
                    }
                }
            },
            include: {perfil: true}
        })

        res.json(usuarioAtualizado)
    } catch(error){
        res.status(400).json({erro: "Erro ao atualizar ususario", detalhe: error.message})
    }
});

//atauliza parcialmente
app.patch("/usuarios/:id", async(req, res) =>{
    try{
        const {id} = req.params;
        const {email, senha, bio, fotoUrl} = req.body;

        const dadosAtualizacao ={
            email,
            senha,
            perfil: (bio || fotoUrl) ?{
                update: {
                    bio,
                    fotoUrl
                }
            } : undefined
        };

        Object.keys(dadosAtualizacao).forEach(key => dadosAtualizacao[key] === undefined && delete dadosAtualizacao[key])

        const usuario = await prisma.usuario.update({
            where: {id: Number(id)},
            data: dadosAtualizacao,
            include: {perfil: true}
        })

        res.json(usuario)
    } catch(error){
        res.status(400).json({erro: "Erro ao atualizar parcialmente", detalhe: error.message})
    }
});

app.delete("/usuarios/:id", async(req, res) =>{
    try{
        const {id} = req.params;

        await prisma.usuario.delete({
            where: {id: Number(id)}
        });

        res.status(204).send()
    } catch(error){
        res.status(400).json({erro: "Erro ao deletar usuario", detalhe: error.message})
    }
});


app.listen(PORT, () =>{
    console.log(`❌​1️⃣​8️⃣​ API para Maiores com rodamento em: http://localhost:${PORT}`)
})
