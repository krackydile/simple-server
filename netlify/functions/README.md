# simple-server (go)

This is simple example of a backend server that is required to create user tokens that are used to initialize and authenticate with ZDK client API.

This code is not meant to be used in production, in real world scenario the endpoint `/api/token` should be protected by some sort of authentication (OAuth, Sessions etc.) to make sure that YOU are in control of what and how users are created.

Instructions to run
```shell
export ZDK_API_KEY="<your_api_key>"
go run *.go
```

This example requires Golang 1.21 to run.

Then open in your browser http://localhost:3000/