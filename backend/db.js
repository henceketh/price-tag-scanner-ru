import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://great:koakdpkOASKOkpqwkknA232SDPAOSJDASJODjowaqjeooAIWIWIEOEzbvawue@192.168.1.217:27017/?directConnection=true&serverSelectionTimeoutMS=2000&authSource=admin&appName=mongosh+2.5.8';

export const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: 'priceTagRecognizer'
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB error:', err);
});

export default mongoose;
