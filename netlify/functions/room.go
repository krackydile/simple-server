package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

func SelectRoom(id string) (map[string]any, error) {

	body, err := json.Marshal(map[string]any{
		"arguments": []map[string]any{
			{
				"query": map[string]any{
					"conditions": []map[string]any{
						{
							"ids": []string{id},
						},
					},
				},
			},
		},
	})

	req, err := http.NewRequest(http.MethodPost, fmt.Sprintf("https://room.%s/room.rooms.private.v1.Service/Select", ZDK_API_HOST), bytes.NewReader(body))
	if err != nil {
		return nil, err
	}

	req.Header.Add("content-type", "application/json")
	req.Header.Add("authorization", "Bearer "+ZDK_API_KEY)

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}

	resBody, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}

	var resJson map[string]any
	if err := json.Unmarshal(resBody, &resJson); err != nil {
		return nil, err
	}

	return resJson, nil
}

func CreateRoom(id string, capacity int64, metadata map[string]any, retention time.Duration) (map[string]any, error) {

	// id is optional, it is in UUID standard, when empty it will be automatically created
	// capacity is optional, when not present in the request it will automatically default to '32', max value is '256'
	// retention is optional, when not present in the request it will automatically default to '0' which means that room will never be automatically deleted by us

	body, err := json.Marshal(map[string]any{
		"arguments": []map[string]any{
			{
				"id":        id,
				"kind":      2,
				"capacity":  capacity,
				"metadata":  metadata,
				"retention": retention.Milliseconds(),
			},
		},
	})

	req, err := http.NewRequest(http.MethodPost, fmt.Sprintf("https://room.%s/room.rooms.private.v1.Service/Create", ZDK_API_HOST), bytes.NewReader(body))
	if err != nil {
		return nil, err
	}

	req.Header.Add("content-type", "application/json")
	req.Header.Add("authorization", "Bearer "+ZDK_API_KEY)

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}

	resBody, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}

	var resJson map[string]any
	if err := json.Unmarshal(resBody, &resJson); err != nil {
		return nil, err
	}

	return resJson, nil
}

func UpdateRoom(id string, capacity *int64, metadata *map[string]string) (map[string]any, error) {

	// this request only updates values which are provided, it's possible to update only 'capacity' without 'metadata', or both or none

	capacityBody, metadataBody := map[string]any(nil), map[string]any(nil)

	if capacity != nil {
		capacityBody = map[string]any{
			"value": *capacity,
		}
	}

	if metadata != nil {
		metadataBody = map[string]any{
			"value": *metadata,
		}
	}

	body, err := json.Marshal(map[string]any{
		"arguments": []map[string]any{
			{
				"query": map[string]any{
					"conditions": []map[string]any{
						{
							"ids": []string{id},
						},
					},
				},
				"capacity": capacityBody,
				"metadata": metadataBody,
			},
		},
	})

	req, err := http.NewRequest(http.MethodPost, fmt.Sprintf("https://room.%s/room.rooms.private.v1.Service/Update", ZDK_API_HOST), bytes.NewReader(body))
	if err != nil {
		return nil, err
	}

	req.Header.Add("content-type", "application/json")
	req.Header.Add("authorization", "Bearer "+ZDK_API_KEY)

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}

	resBody, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}

	var resJson map[string]any
	if err := json.Unmarshal(resBody, &resJson); err != nil {
		return nil, err
	}

	return resJson, nil
}

func DeleteRoom(id string) (map[string]any, error) {

	body, err := json.Marshal(map[string]any{
		"arguments": []map[string]any{
			{
				"query": map[string]any{
					"conditions": []map[string]any{
						{
							"ids": []string{id},
						},
					},
				},
			},
		},
	})

	req, err := http.NewRequest(http.MethodPost, fmt.Sprintf("https://room.%s/room.rooms.private.v1.Service/Delete", ZDK_API_HOST), bytes.NewReader(body))
	if err != nil {
		return nil, err
	}

	req.Header.Add("content-type", "application/json")
	req.Header.Add("authorization", "Bearer "+ZDK_API_KEY)

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}

	resBody, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}

	var resJson map[string]any
	if err := json.Unmarshal(resBody, &resJson); err != nil {
		return nil, err
	}

	return resJson, nil
}
