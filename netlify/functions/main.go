package main

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/google/uuid"
	"io"
	"math/rand"
	"net/http"
	"os"
	"sync"
	"time"
)

var ZDK_API_KEY string
var ZDK_API_HOST string
var frontendPath string

type User struct {
	Id   string `json:"id"`
	Name string `json:"name"`
}

func createRoom() (map[string]any, error) {
	body := map[string]any{
		"arguments": []map[string]any{
			{
				"metadata": map[string]any{
					"name": "test room",
				},
				"kind":      2,
				"capacity":  32,             // capacity is optional, when not present in the request it will automatically default to '32', max value is '256'
				"retention": 86400000000000, // room will be automatically deleted after 24 hours of inactivity
			},
		},
	}
	jsonBody, err := json.Marshal(body)
	req, err := http.NewRequest(http.MethodPost, fmt.Sprintf("https://room.%s/room.rooms.private.v1.Service/Create", ZDK_API_HOST), bytes.NewReader(jsonBody))
	if err != nil {
		return nil, err
	}

	req.Header.Add("content-type", "application/json")
	req.Header.Add("authorization", "Bearer "+ZDK_API_KEY)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}

	if res.StatusCode != 200 {
		return nil, errors.New("unauthorized")
	}

	resBody, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}

	var respJson map[string]any
	if err := json.Unmarshal(resBody, &respJson); err != nil {
		return nil, err
	}

	return respJson["rooms"].([]interface{})[0].(map[string]any), nil
}

func kickMember(userId string) error {

	// todo; instead of "user_ids" below "room_ids" can be used to kick everyone from a specific room or rooms, multiple room ids might be passed, same with user ids, one request can kick multiple users

	body := map[string]any{
		"arguments": []map[string]any{
			{
				"query": map[string]any{
					"conditions": []map[string]any{
						{
							"user_ids": []string{userId},
						},
					},
				},
				"reason": "something",
			},
		},
	}
	jsonBody, err := json.Marshal(body)
	req, err := http.NewRequest(http.MethodPost, fmt.Sprintf("https://room.%s/room.members.private.v1.Service/Kick", ZDK_API_HOST), bytes.NewReader(jsonBody))
	if err != nil {
		return err
	}

	req.Header.Add("content-type", "application/json")
	req.Header.Add("authorization", "Bearer "+ZDK_API_KEY)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}

	if res.StatusCode != 200 {
		return errors.New("unauthorized")
	}

	return nil
}

func getAuthToken(id, nickname string) (string, error) {
	body := map[string]any{
		"arguments": []map[string]any{
			{
				"id":          id,
				"avatar":      "",       //optional
				"nickname":    nickname, //optional
				"fullname":    "",       //optional
				"permissions": []int{100, 200, 300, 400, 500, 600, 700, 800},
			},
		},
	}
	jsonBody, err := json.Marshal(body)
	req, err := http.NewRequest(http.MethodPost, fmt.Sprintf("https://user.%s/user.tokens.private.v1.Service/Create", ZDK_API_HOST), bytes.NewReader(jsonBody))
	if err != nil {
		return "", err
	}

	req.Header.Add("content-type", "application/json")
	req.Header.Add("authorization", "Bearer "+ZDK_API_KEY)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}

	if res.StatusCode != 200 {
		return "", errors.New("unauthorized")
	}

	resBody, err := io.ReadAll(res.Body)
	if err != nil {
		return "", err
	}

	var respJson map[string]any
	if err := json.Unmarshal(resBody, &respJson); err != nil {
		return "", err
	}

	return respJson["tokens"].([]any)[0].(string), nil
}

var mutex sync.Mutex

func session(w http.ResponseWriter, r *http.Request) *User {
	sessionCookie, err := r.Cookie("session")
	if err == nil {
		var user User
		data, err := base64.URLEncoding.DecodeString(sessionCookie.Value)
		if err != nil {
			panic(err)
		}

		if err := json.Unmarshal(data, &user); err != nil {
			panic(err)
		}

		return &user
	}

	mutex.Lock()
	defer mutex.Unlock()
	user := &User{
		Id:   uuid.New().String(),
		Name: fmt.Sprintf("random-user-%v", rand.Intn(100)),
	}

	data, err := json.Marshal(user)
	if err != nil {
		panic(err)
	}

	sessionCookie = &http.Cookie{Name: "session", Value: base64.URLEncoding.EncodeToString(data), Expires: time.Now().Add(365 * 24 * time.Hour)}
	http.SetCookie(w, sessionCookie)

	return user
}

func index(w http.ResponseWriter, r *http.Request) {
	fmt.Println(session(w, r), r.Header)

	http.ServeFile(w, r, fmt.Sprintf("%s/index.html", frontendPath))
}

func apiMe(w http.ResponseWriter, r *http.Request) {
	data, err := json.Marshal(session(w, r))
	if err != nil {
		w.WriteHeader(500)
		fmt.Fprintln(w, err.Error())
		return
	}

	w.WriteHeader(200)
	w.Write(data)
}

func apiToken(w http.ResponseWriter, r *http.Request) {
	user := session(w, r)
	token, err := getAuthToken(user.Id, user.Name)
	if err != nil {
		w.WriteHeader(500)
		fmt.Fprintln(w, err.Error())
		return
	}

	data, err := json.Marshal(map[string]any{"token": token})
	if err != nil {
		w.WriteHeader(500)
		fmt.Fprintln(w, err.Error())
		return
	}

	w.WriteHeader(200)
	w.Write(data)
}

func apiRoom(w http.ResponseWriter, r *http.Request) {
	room, err := createRoom()
	if err != nil {
		w.WriteHeader(500)
		fmt.Fprintln(w, err.Error())
		return
	}

	data, err := json.Marshal(map[string]any{"room": room})
	if err != nil {
		w.WriteHeader(500)
		fmt.Fprintln(w, err.Error())
		return
	}

	w.WriteHeader(200)
	w.Write(data)
}

func apiKick(w http.ResponseWriter, r *http.Request) {

	userId := r.URL.Query().Get("userId")
	if userId == "" {
		w.WriteHeader(500)
		return
	}

	err := kickMember(userId)
	if err != nil {
		w.WriteHeader(500)
		fmt.Fprintln(w, err.Error())
		return
	}

	w.WriteHeader(200)
	w.Write([]byte("{}"))
}

func main() {
	ZDK_API_KEY = os.Getenv("ZDK_API_KEY")
	if ZDK_API_KEY == "" {
		panic("env variable ZDK_API_KEY is not defined")
	}
	ZDK_API_HOST = os.Getenv("ZDK_API_HOST")
	if ZDK_API_KEY == "" {
		panic("env variable ZDK_API_HOST is not defined")
	}

	frontendPath = os.Getenv("FRONTEND_PATH")
	if frontendPath == "" {
		frontendPath = "../../../frontend/build"
	}

	http.HandleFunc("/", index)
	http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir(fmt.Sprintf("%s/static", frontendPath)))))
	http.HandleFunc("/api/me", apiMe)
	http.HandleFunc("/api/room", apiRoom)
	http.HandleFunc("/api/token", apiToken)
	http.HandleFunc("/api/kick", apiKick)

	fmt.Println("simple-server is running on http://localhost:3000")
	fmt.Println(http.ListenAndServe(":3000", nil))
}
