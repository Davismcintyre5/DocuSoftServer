const mongoose = require('mongoose');

const socialEntrySchema = new mongoose.Schema({
  url: { type: String, default: '' },
  show: { type: Boolean, default: false }
}, { _id: false });

const sectionSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: true },
  order: { type: Number, default: 0 }
}, { _id: false });

const companySchema = new mongoose.Schema({
  name: { type: String, default: 'HDM Developers' },
  tagline: { type: String, default: '' },
  description: { type: String, default: '' },
  logo: { type: String, default: '' },
  logoDark: { type: String, default: '' },
  favicon: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  whatsapp: { type: String, default: '' },
  whatsappMessage: { type: String, default: '' },
  address: { type: String, default: '' },
  city: { type: String, default: '' },
  country: { type: String, default: '' },
  primaryColor: { type: String, default: '#3908e7' },
  secondaryColor: { type: String, default: '#30dd0e' },
  accentColor: { type: String, default: '#10b981' },
  fontFamily: { type: String, default: 'Inter' },

  hero: {
    enabled: { type: Boolean, default: true },
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    description: { type: String, default: '' },
    ctaPrimary: { type: String, default: 'Our Services' },
    ctaPrimaryLink: { type: String, default: '#services' },
    ctaSecondary: { type: String, default: 'Get in Touch' },
    ctaSecondaryLink: { type: String, default: '#contact' },
    backgroundType: { type: String, default: 'gradient' },
    backgroundImage: { type: String, default: '' },
    gradientStart: { type: String, default: '#0a5c8e' },
    gradientEnd: { type: String, default: '#1e3a5f' },
    typingText: [String],
    showLogo: { type: Boolean, default: true }
  },

  social: {
    facebook: { type: socialEntrySchema, default: () => ({}) },
    twitter: { type: socialEntrySchema, default: () => ({}) },
    instagram: { type: socialEntrySchema, default: () => ({}) },
    linkedin: { type: socialEntrySchema, default: () => ({}) },
    github: { type: socialEntrySchema, default: () => ({}) },
    youtube: { type: socialEntrySchema, default: () => ({}) },
    discord: { type: socialEntrySchema, default: () => ({}) },
    stackoverflow: { type: socialEntrySchema, default: () => ({}) }
  },

  sections: {
    hero: { type: sectionSchema, default: () => ({}) },
    websiteTypes: { type: sectionSchema, default: () => ({}) },
    features: { type: sectionSchema, default: () => ({}) },
    apps: { type: sectionSchema, default: () => ({}) },
    services: { type: sectionSchema, default: () => ({}) },
    projects: { type: sectionSchema, default: () => ({}) },
    gallery: { type: sectionSchema, default: () => ({}) },
    contact: { type: sectionSchema, default: () => ({}) }
  },

  seo: {
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    keywords: { type: String, default: '' },
    ogImage: { type: String, default: '' },
    googleAnalyticsId: { type: String, default: '' },
    customCSS: { type: String, default: '' }
  },

  ai: {
    enabled: { type: Boolean, default: false },
    provider: { type: String, default: 'openai' },
    apiKey: { type: String, default: '', select: false },
    model: { type: String, default: 'gpt-4o-mini' },
    name: { type: String, default: 'HDM AI' },
    greeting: { type: String, default: 'Hello! 👋 I\'m HDM AI' },
    systemPrompt: { type: String, default: 'You are HDM AI' },
    rateLimit: { type: Number, default: 20 },
    fallbackMessage: { type: String, default: 'I\'ll connect you with our team!' },
    knowledgeBase: {
      company: { type: Boolean, default: true },
      services: { type: Boolean, default: true },
      apps: { type: Boolean, default: true },
      projects: { type: Boolean, default: true }
    },
    appearance: {
      color: { type: String, default: '#0a5c8e' },
      position: { type: String, default: 'right' },
      label: { type: String, default: 'Chat with HDM AI' }
    }
  }
}, { timestamps: true, collection: 'hdm_companies' });

module.exports = mongoose.model('HdmCompany', companySchema);