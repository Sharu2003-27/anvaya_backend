const { intializeDatabase } = require("./database/db.connect")
const express = require("express")
const cors = require("cors")
require("dotenv").config()
const Lead = require("./models/lead.model")
const Agent = require("./models/salesagent.model")
const Comment = require("./models/comment.model")
const Tag = require("./models/tag.model")
const mongoose = require("mongoose")

intializeDatabase()
const app = express()
app.use(express.json())
app.use(cors())

app.get("/", (req, res) => {
    res.send("Welcome to Anvaya app!!")
})

// Get all sales agents
app.get("/agents", async (req, res) => {
    try {
        const agents = await Agent.find().select("_id name email createdAt")
        res.status(200).json(agents)
    } catch (error) {
        res.status(500).json({ error: "Error in fetching agents" })
    }
})

// Create a new sales agent
app.post("/agents", async (req, res) => {
    try {
        const { name, email } = req.body

        if (!name || !email) {
            return res.status(400).json({ error: "Invalid input: 'name' and 'email' are required." })
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: "Invalid input: 'email' must be a valid email address." })
        }

        const newAgent = new Agent({ name, email })
        await newAgent.save()
        
        res.status(201).json({
            id: newAgent._id,
            name: newAgent.name,
            email: newAgent.email,
            createdAt: newAgent.createdAt
        })
    } catch (error) {
        res.status(400).json({ error: "Error in adding new agent." })
    }
})

// Get all leads with filtering
app.get("/leads", async (req, res) => {
    try {
        const { salesAgent, status, tags, source } = req.query
        const filter = {}

        if (salesAgent) {
            if (!mongoose.Types.ObjectId.isValid(salesAgent)) {
                return res.status(400).json({ error: "Invalid input: 'salesAgent' must be a valid ObjectId." })
            }
            filter.salesAgent = salesAgent
        }

        if (status) {
            const validStatuses = ['New', 'Contacted', 'Qualified', 'Proposal Sent', 'Closed']
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ 
                    error: `Invalid input: 'status' must be one of ['New', 'Contacted', 'Qualified', 'Proposal Sent', 'Closed'].` 
                })
            }
            filter.status = status
        }

        if (source) {
            const validSources = ['Website', 'Referral', 'Cold Call', 'Advertisement', 'Email', 'Other']
            if (!validSources.includes(source)) {
                return res.status(400).json({ 
                    error: `Invalid input: 'source' must be one of the predefined values.` 
                })
            }
            filter.source = source
        }

        if (tags) {
            filter.tags = { $in: Array.isArray(tags) ? tags : [tags] }
        }

        const leads = await Lead.find(filter)
            .populate('salesAgent', 'name _id')
            .sort({ createdAt: -1 })

        const formattedLeads = leads.map(lead => ({
            id: lead._id,
            name: lead.name,
            source: lead.source,
            salesAgent: {
                id: lead.salesAgent._id,
                name: lead.salesAgent.name
            },
            status: lead.status,
            tags: lead.tags,
            timeToClose: lead.timeToClose,
            priority: lead.priority,
            createdAt: lead.createdAt,
            updatedAt: lead.updatedAt
        }))

        res.status(200).json(formattedLeads)
    } catch (error) {
        res.status(500).json({ error: "Error in fetching leads." })
    }
})

// Get a single lead by ID
app.get("/leads/:id", async (req, res) => {
    try {
        const { id } = req.params
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid lead ID." })
        }

        const lead = await Lead.findById(id).populate('salesAgent', 'name _id')
        
        if (!lead) {
            return res.status(404).json({ error: `Lead with ID '${id}' not found.` })
        }

        res.status(200).json({
            id: lead._id,
            name: lead.name,
            source: lead.source,
            salesAgent: {
                id: lead.salesAgent._id,
                name: lead.salesAgent.name
            },
            status: lead.status,
            tags: lead.tags,
            timeToClose: lead.timeToClose,
            priority: lead.priority,
            createdAt: lead.createdAt,
            updatedAt: lead.updatedAt,
            closedAt: lead.closedAt
        })
    } catch (error) {
        res.status(500).json({ error: "Error in fetching lead." })
    }
})

// Create a new lead
app.post("/leads", async (req, res) => {
    try {
        const { name, source, salesAgent, status, tags, timeToClose, priority } = req.body

        // Validation
        if (!name) {
            return res.status(400).json({ error: "Invalid input: 'name' is required." })
        }
        if (!source) {
            return res.status(400).json({ error: "Invalid input: 'source' is required." })
        }
        if (!salesAgent) {
            return res.status(400).json({ error: "Invalid input: 'salesAgent' is required." })
        }
        if (!mongoose.Types.ObjectId.isValid(salesAgent)) {
            return res.status(400).json({ error: "Invalid input: 'salesAgent' must be a valid ObjectId." })
        }

        // Check if sales agent exists
        const agent = await Agent.findById(salesAgent)
        if (!agent) {
            return res.status(404).json({ error: `Sales agent with ID '${salesAgent}' not found.` })
        }

        const validStatuses = ['New', 'Contacted', 'Qualified', 'Proposal Sent', 'Closed']
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ 
                error: `Invalid input: 'status' must be one of ['New', 'Contacted', 'Qualified', 'Proposal Sent', 'Closed'].` 
            })
        }

        const validPriorities = ['High', 'Medium', 'Low']
        if (priority && !validPriorities.includes(priority)) {
            return res.status(400).json({ 
                error: `Invalid input: 'priority' must be one of ['High', 'Medium', 'Low'].` 
            })
        }

        if (!timeToClose || timeToClose < 1) {
            return res.status(400).json({ error: "Invalid input: 'timeToClose' must be a positive integer." })
        }

        const newLead = new Lead({
            name,
            source,
            salesAgent,
            status: status || 'New',
            tags: tags || [],
            timeToClose,
            priority: priority || 'Medium'
        })

        await newLead.save()
        await newLead.populate('salesAgent', 'name _id')

        res.status(201).json({
            id: newLead._id,
            name: newLead.name,
            source: newLead.source,
            salesAgent: {
                id: newLead.salesAgent._id,
                name: newLead.salesAgent.name
            },
            status: newLead.status,
            tags: newLead.tags,
            timeToClose: newLead.timeToClose,
            priority: newLead.priority,
            createdAt: newLead.createdAt,
            updatedAt: newLead.updatedAt
        })
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: `Invalid input: ${error.message}` })
        }
        res.status(400).json({ error: "Error in adding new lead." })
    }
})

// Update a lead
app.put("/leads/:id", async (req, res) => {
    try {
        const { id } = req.params
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid lead ID." })
        }

        const { name, source, salesAgent, status, tags, timeToClose, priority } = req.body

        // Validation
        if (!name || !source || !salesAgent || !status || !timeToClose || !priority) {
            return res.status(400).json({ error: "All fields are required when updating a lead." })
        }

        if (!mongoose.Types.ObjectId.isValid(salesAgent)) {
            return res.status(400).json({ error: "Invalid input: 'salesAgent' must be a valid ObjectId." })
        }

        const agent = await Agent.findById(salesAgent)
        if (!agent) {
            return res.status(404).json({ error: `Sales agent with ID '${salesAgent}' not found.` })
        }

        const validStatuses = ['New', 'Contacted', 'Qualified', 'Proposal Sent', 'Closed']
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ 
                error: `Invalid input: 'status' must be one of ['New', 'Contacted', 'Qualified', 'Proposal Sent', 'Closed'].` 
            })
        }

        const validPriorities = ['High', 'Medium', 'Low']
        if (!validPriorities.includes(priority)) {
            return res.status(400).json({ 
                error: `Invalid input: 'priority' must be one of ['High', 'Medium', 'Low'].` 
            })
        }

        if (timeToClose < 1) {
            return res.status(400).json({ error: "Invalid input: 'timeToClose' must be a positive integer." })
        }

        const updateData = {
            name,
            source,
            salesAgent,
            status,
            tags: tags || [],
            timeToClose,
            priority
        }

        // Set closedAt if status is Closed
        if (status === 'Closed') {
            updateData.closedAt = new Date()
        }

        const lead = await Lead.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
            .populate('salesAgent', 'name _id')

        if (!lead) {
            return res.status(404).json({ error: `Lead with ID '${id}' not found.` })
        }

        res.status(200).json({
            id: lead._id,
            name: lead.name,
            source: lead.source,
            salesAgent: {
                id: lead.salesAgent._id,
                name: lead.salesAgent.name
            },
            status: lead.status,
            tags: lead.tags,
            timeToClose: lead.timeToClose,
            priority: lead.priority,
            updatedAt: lead.updatedAt
        })
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: `Invalid input: ${error.message}` })
        }
        res.status(500).json({ error: "Error in updating lead." })
    }
})

// Delete a lead
app.delete("/leads/:id", async (req, res) => {
    try {
        const { id } = req.params
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid lead ID." })
        }

        const lead = await Lead.findByIdAndDelete(id)
        
        if (!lead) {
            return res.status(404).json({ error: `Lead with ID '${id}' not found.` })
        }

        // Also delete all comments associated with this lead
        await Comment.deleteMany({ lead: id })

        res.status(200).json({ message: "Lead deleted successfully." })
    } catch (error) {
        res.status(500).json({ error: "Error in deleting lead." })
    }
})

// Get all comments for a lead
app.get("/leads/:id/comments", async (req, res) => {
    try {
        const { id } = req.params
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid lead ID." })
        }

        const lead = await Lead.findById(id)
        if (!lead) {
            return res.status(404).json({ error: `Lead with ID '${id}' not found.` })
        }

        const comments = await Comment.find({ lead: id })
            .populate('author', 'name _id')
            .sort({ createdAt: -1 })

        const formattedComments = comments.map(comment => ({
            id: comment._id,
            commentText: comment.commentText,
            author: comment.author ? comment.author.name : 'Unknown',
            createdAt: comment.createdAt
        }))

        res.status(200).json(formattedComments)
    } catch (error) {
        res.status(500).json({ error: "Error in fetching comments." })
    }
})

// Add a comment to a lead
app.post("/leads/:id/comments", async (req, res) => {
    try {
        const { id } = req.params
        const { commentText, author } = req.body

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid lead ID." })
        }

        if (!commentText) {
            return res.status(400).json({ error: "Invalid input: 'commentText' is required." })
        }

        if (!author) {
            return res.status(400).json({ error: "Invalid input: 'author' is required." })
        }

        if (!mongoose.Types.ObjectId.isValid(author)) {
            return res.status(400).json({ error: "Invalid input: 'author' must be a valid ObjectId." })
        }

        const lead = await Lead.findById(id)
        if (!lead) {
            return res.status(404).json({ error: `Lead with ID '${id}' not found.` })
        }

        const agent = await Agent.findById(author)
        if (!agent) {
            return res.status(404).json({ error: `Sales agent with ID '${author}' not found.` })
        }

        const newComment = new Comment({
            lead: id,
            commentText,
            author
        })

        await newComment.save()
        await newComment.populate('author', 'name _id')

        res.status(201).json({
            id: newComment._id,
            commentText: newComment.commentText,
            author: newComment.author.name,
            createdAt: newComment.createdAt
        })
    } catch (error) {
        res.status(500).json({ error: "Error in adding comment." })
    }
})

// Get all tags
app.get("/tags", async (req, res) => {
    try {
        const tags = await Tag.find().select("_id name createdAt")
        res.status(200).json(tags)
    } catch (error) {
        res.status(500).json({ error: "Error in fetching tags." })
    }
})

// Create a new tag
app.post("/tags", async (req, res) => {
    try {
        const { name } = req.body

        if (!name) {
            return res.status(400).json({ error: "Invalid input: 'name' is required." })
        }

        const newTag = new Tag({ name })
        await newTag.save()

        res.status(201).json({
            id: newTag._id,
            name: newTag.name,
            createdAt: newTag.createdAt
        })
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ error: `Tag with name '${req.body.name}' already exists.` })
        }
        res.status(500).json({ error: "Error in adding tag." })
    }
})

// Get leads closed last week
app.get("/report/last-week", async (req, res) => {
    try {
        const oneWeekAgo = new Date()
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

        const leads = await Lead.find({
            status: 'Closed',
            closedAt: { $gte: oneWeekAgo }
        })
        .populate('salesAgent', 'name _id')
        .sort({ closedAt: -1 })

        const formattedLeads = leads.map(lead => ({
            id: lead._id,
            name: lead.name,
            salesAgent: lead.salesAgent ? lead.salesAgent.name : 'Unknown',
            closedAt: lead.closedAt
        }))

        res.status(200).json(formattedLeads)
    } catch (error) {
        res.status(500).json({ error: "Error in fetching last week's closed leads." })
    }
})

// Get total leads in pipeline
app.get("/report/pipeline", async (req, res) => {
    try {
        const pipelineLeads = await Lead.find({ status: { $ne: 'Closed' } })
        const totalLeadsInPipeline = pipelineLeads.length

        // Group by status
        const statusGroups = {}
        pipelineLeads.forEach(lead => {
            statusGroups[lead.status] = (statusGroups[lead.status] || 0) + 1
        })

        res.status(200).json({
            totalLeadsInPipeline,
            byStatus: statusGroups
        })
    } catch (error) {
        res.status(500).json({ error: "Error in fetching pipeline data." })
    }
})

// Get leads closed by agent
app.get("/report/closed-by-agent", async (req, res) => {
    try {
        const closedLeads = await Lead.find({ status: 'Closed' })
            .populate('salesAgent', 'name _id')

        const agentStats = {}
        closedLeads.forEach(lead => {
            if (lead.salesAgent) {
                const agentId = lead.salesAgent._id.toString()
                const agentName = lead.salesAgent.name
                
                if (!agentStats[agentId]) {
                    agentStats[agentId] = {
                        agentId,
                        agentName,
                        closedCount: 0
                    }
                }
                agentStats[agentId].closedCount++
            }
        })

        const result = Object.values(agentStats)
        res.status(200).json(result)
    } catch (error) {
        res.status(500).json({ error: "Error in fetching closed leads by agent." })
    }
})

// Get lead status distribution
app.get("/report/status-distribution", async (req, res) => {
    try {
        const leads = await Lead.find()
        const distribution = {}

        leads.forEach(lead => {
            distribution[lead.status] = (distribution[lead.status] || 0) + 1
        })

        res.status(200).json(distribution)
    } catch (error) {
        res.status(500).json({ error: "Error in fetching status distribution." })
    }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
    console.log(`Server is running on ${PORT}`)
})
