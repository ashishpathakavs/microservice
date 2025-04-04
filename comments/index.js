const express = require("express");
const bodyParser = require("body-parser");
const { randomBytes } = require("crypto");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());
app.use(cors());

const commentsByPostId = {};

app.get("/posts/:id/comments", (req, res) => {
  // Get all comments for a post
  res.send(commentsByPostId[req.params.id] || []);
});

app.post("/posts/:id/comments", async (req, res) => {
  // Create a comment for a post
  const commentId = randomBytes(4).toString("hex");
  const { content } = req.body;

  const comments = commentsByPostId[req.params.id] || [];
  comments.push({ id: commentId, content, status: "pending" });
  commentsByPostId[req.params.id] = comments;

  await axios
    .post("http://event-bus-srv:4005/events", {
      type: "commentCreated",
      data: {
        id: commentId,
        content,
        postId: req.params.id,
        status: "pending",
      },
    })
    .catch((err) => console.log(err));

  res.status(201).send(comments);
});

app.post("/events", async (req, res) => {
  const { type, data } = req.body;
  if (type === "commentModerated") {
    const { postId, id, status, content } = data;

    const comments = commentsByPostId[postId];
    const comment = comments.find((comment) => {
      return comment.id === id;
    });

    comment.status = status;

    await axios
      .post("http://event-bus-srv:4005/events", {
        type: "commentUpdated",
        data: {
          id,
          status,
          postId,
          content,
        },
      })
      .catch((err) => console.log(err));
  }

  console.log("event recievied", req.body.type);
  res.send({});
});

app.listen(4001, () => {
  console.log("Listening on 4001");
});
