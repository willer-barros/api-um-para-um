# ❌​1️⃣​8️⃣ API para Maiores - Sistema de Usuários e Perfis

Este projeto é uma API REST desenvolvida em Node.js com Express e TypeScript/Prisma, focada na gestão de usuários e seus respectivos perfis através de um relacionamento **Um-para-Um (1:1)** no banco de dados PostgreSQL.

O objetivo desta aplicação é servir como base de estudos sobre métodos HTTP, persistência de dados assíncrona, tratamento de exceções e monitoramento de requisições em tempo real.

---

## 🏗️ Arquitetura do Projeto

A API foi estruturada utilizando o modelo Cliente/Servidor, onde as requisições passam por uma camada de middlewares de monitoramento antes de atingirem as regras de negócio e a persistência:

* **Express:** Framework web responsável pelo roteamento e gerenciamento dos endpoints.
* **Prisma ORM:** Camada de abstração que gerencia as queries, transações e o relacionamento entre as tabelas `Usuario` e `Perfil`.
* **Morgan:** Middleware de log em tempo real que exibe no terminal o status e a performance de cada rota acessada.

---

## 🛠️ Tecnologias Utilizadas

* **Runtime:** Node.js (com suporte a ES Modules)
* **Linguagem:** JavaScript / TypeScript
* **Framework Web:** Express
* **Banco de Dados:** PostgreSQL (Rodando localmente)
* **ORM:** Prisma Client (v7.8.0)
* **Middlewares:** CORS, Morgan (Logger)

---

## 🚀 Como Configurar e Executar o Projeto

### 1. Clonar o repositório e instalar as dependências
No seu terminal, navegue até a pasta do projeto e execute:
```bash
npm install