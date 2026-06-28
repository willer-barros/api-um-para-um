import http from "k6/http"
import {check, sleep} from "k6"

export const options = {
    stages:[
        { duration: "5s", target: 50},
        { duration: "20s", target: 200},
        { duration: "5s", target: 0},
    ],
    thresholds:{
        http_req_failed: ['rate<0.05'],
        http_req_duration: ['p(95)<200'],
    },
};

export default function(){
    const url = "http://127.0.0.1:3000/usuarios";

    const randomId = Math.floor(Math.random() * 10000000)

    const payload = JSON.stringify({
        email: `aluno_${randomId}@senai.com.br`,
        senha: `senha_${randomId}`,
        bio: `Sou o aluno virtual numero ${randomId} testando a API`,
        fotoUrl: `/imagens/avatar_${randomId}`
    })

    const params ={
        headers:{
            "Content-Type": "application/json",
        },
    };

    const res = http.post(url, payload, params)

    check(res, {
        "status é 201": (r) => r.status ===201
    })
    // sleep(0.1)
}