# syntax = docker/dockerfile:1.2

FROM golang:1.21-alpine3.18 as builder

WORKDIR /app

COPY backend backend
COPY frontend frontend

ENV GOOS=linux
ENV GOARCH=amd64
ENV GO111MODULE=on
ENV GOPRIVATE=gitlab.com/evemeta/*
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache \
    cd backend/go/simple-server && \
    /usr/local/go/bin/go build -v -ldflags="-w -s" -o /app/service *.go


FROM alpine:3.18

COPY --from=builder /app/service /demo/backend/go/simple-server/demo-service
COPY --from=builder /app/frontend/build /demo/frontend/build

RUN echo 'hosts: files dns' >> /etc/nsswitch.conf

ENV app_cmd="./demo/backend/go/simple-server/demo-service"
ENV FRONTEND_PATH="/demo/frontend/build"
ENTRYPOINT $app_cmd