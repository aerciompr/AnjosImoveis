# ETAPA 1: Construção (Build) do projeto com Node.js
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .

# Instala as dependências do projeto
RUN npm install

# Compila o projeto (transforma o código React/TypeScript em HTML e JS puros)
RUN npm run build

# ETAPA 2: Servidor Web (Nginx)
FROM nginx:alpine

# Remove as configurações de fábrica do Nginx
RUN rm /etc/nginx/conf.d/default.conf
RUN rm -rf /usr/share/nginx/html/*

# Copia o seu nginx.conf personalizado para dentro do Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# O PULO DO GATO: Copia APENAS os arquivos compilados (da pasta dist) para o Nginx
COPY --from=builder /app/dist /usr/share/nginx/html/

# Expõe a porta 80
EXPOSE 80

# Copia o script de entrypoint
COPY docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh

# Define o script como entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"]

# Inicia o Nginx
CMD ["nginx", "-g", "daemon off;"]