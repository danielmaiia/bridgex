
# BridgeX – Networking sem politicagem

Este é um protótipo funcional do BridgeX, a plataforma de colaboração e
desenvolvimento de carreira para ambientes remotos e híbridos.

## Como rodar

1. Instale as dependências:

```bash
npm install
# ou
yarn
```

2. Crie um projeto no Supabase e defina as variáveis de ambiente:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

3. Rode o projeto em desenvolvimento:

```bash
npm run dev
```

4. Abra http://localhost:3000 no navegador.

## Importante

- As telas já estão montadas com fluxos básicos (perfil, microtarefas, CV,
  painel do RH), mas ainda usam dados mockados.
- Você só precisa conectar os formulários e listas às tabelas do Supabase.
- A rota `/api/match` demonstra o uso de TF-IDF + similaridade do cosseno
  para o pilar de IA.
- Para o OCR, basta integrar o `tesseract.js` em um componente de upload
  de certificado (não incluído aqui para manter o exemplo enxuto).

Use este projeto como base para a Global Solution, ajustando conforme
a documentação de requisitos que definimos.
