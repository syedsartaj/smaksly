import mongoose from 'mongoose';

const blogSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: String,
  image_url: String,
  publish_date: Date,
  modify_date: Date,
  category: String,
  body: String,
  slug: String
}, { _id: false });

const layoutSchema = new mongoose.Schema({
  Header: String,
  Hero: String,
  Heading: String,
  Subheading: String,
  ButtonText: String,
  Footer: String,
  companySlogan: String,
  layoutType: String,
  primaryColor: String,
  secondaryColor: String,
  fontFamily: String,
  bloglayout: String,
  body_aboutus: String,
  body_contactus: String,
  body_privacy_policy: String,
  body_services: String,
  companyName: String,
  emailid:String,
  publish_date:String,
}, { _id: false });

const deploymentDataSchema = new mongoose.Schema({
  Layout: layoutSchema,
  blogs: [blogSchema]
}, { _id: false });

const deploymentSchema = new mongoose.Schema({
  Domain: String,
  category: String,
  Custom_Domain: String,
  git_repo: String,
  vercel_id: String,
  Data: [deploymentDataSchema]
}, { _id: false });

const clientSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  Deployments: [deploymentSchema]
});

export default mongoose.models.Client || mongoose.model('Client', clientSchema);
