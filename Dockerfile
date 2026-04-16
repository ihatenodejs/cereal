FROM oven/bun:latest

RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN bun install --frozen-lockfile

COPY . .

EXPOSE 3000

CMD ["bun", "--hot", "index.ts"]
