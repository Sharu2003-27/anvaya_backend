const { intializeDatabase } = require("./database/db.connect")
const express = require("express")
require("dotenv").config()
const Lead = require("./models/lead.model")
const Agent = require("./models/salesagent.model")
const Comment = require("./models/comment.model")
const Tag = require("./models/tag.model")

intializeDatabase()
const app = express()
app.use(express.json()) 

app.get("/", (req, res) => {
    res.send("Welcome to Anvaya app!!")
})

// 1. Agents
app.get("/agents", async (req, res) => {
    try {
        const agents = await Agent.find()
        res.status(200).json(agents)
    } catch (error) {
        res.status(500).json({error: "Error in fetching agents"})
    }
})

app.post("/agents", async (req, res) => {
    try {
        const newAgent = new Agent(req.body)
        await newAgent.save()
        res.status(201).json({message: "Agent added successfully", agent: newAgent })
    } catch (error) {
         res.status(400).json({ error: "Error in adding new agent."});
    }
})

// 2. Leads
app.get("/leads", async (req, res) => {
    try {
        const leads = await Lead.find();
        res.status(200).json(leads);
    } catch (error) {
        res.status(500).json({ error: "Error in fetching leads." });
    }
});

app.post("/leads", async (req, res) => {
   try {
     const newLead = new Lead(req.body)
     await newLead.save()
     res.status(201).json({message: "Lead added successfully.", lead: newLead })
   } catch (error) {
     console.error(error);
     res.status(400).json({ error: "Error in adding new lead."});
   }
})

// 3. Comments      
app.get("/leads/:id/comments", async (req, res) => {
    try {
        const comments = await Comment.find()
        res.status(200).json(comments)
    } catch (error) {
        res.status(400).json({ error: "Error in fetching comments" });
    }
});


app.post("/leads/:id/comments", async (req, res) => {
    try { 
        const {  commentText, author } = req.body; 
        const leadId = req.params.id;
        const newComment = new Comment({
            lead: leadId,
            commentText: commentText,
            author: author
        });
        await newComment.save();
        res.status(201).json({ message: "Comment added successfully.", comment: newComment });
    } catch (error) {  
        res.status(500).json({error: "Error in adding comment"})
    }
})

// 4. Tags
app.get("/tags", async (req, res) => {
    try {
        const tags = await Tag.find()
        res.status(200).json(tags)
    } catch (error) {
        res.status(400).json({ error: "Error in fetching tags." })
    }
})

app.post("/tags", async (req, res) => {
    try {
        const newTag = req.body
        await newTag.save()
        res.status(201).json({ message: "Tag added successfully.", tag: newTag })
    } catch (error) {
        res.status(500).json({ error: "Error in adding tags." })
    }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
    console.log(`Server is running on ${PORT}`);
})