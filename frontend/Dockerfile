FROM node:18

WORKDIR /app

RUN corepack disable

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"] 