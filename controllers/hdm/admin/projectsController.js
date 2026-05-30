const { getHdmDB } = require('../../../config/hdm/db');

exports.getProjects = async (req, res) => {
  try {
    const db = getHdmDB();
    const projects = await db.model('HdmProject').find().sort({ order: 1 });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch projects' });
  }
};

exports.createProject = async (req, res) => {
  try {
    const db = getHdmDB();
    const project = await db.model('HdmProject').create(req.body);
    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create project' });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const db = getHdmDB();
    const project = await db.model('HdmProject').findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update project' });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const db = getHdmDB();
    const project = await db.model('HdmProject').findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json({ message: 'Project deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete project' });
  }
};