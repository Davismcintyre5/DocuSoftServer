const axios = require('axios');

const sendMessage = async (baseUrl, apiKey, message, source, context) => {
  try {
    const response = await axios.post(
      `${baseUrl}/projects/widget/chat`,
      { message, source, provider: 'groq', context },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 15000
      }
    );

    return response.data;
  } catch (error) {
    console.error('AI Service error:', error.message);
    if (error.response) {
      return {
        success: false,
        error: error.response.data?.error || 'AI service returned an error',
        status: error.response.status
      };
    }
    return {
      success: false,
      error: 'Failed to reach AI service. Please try again.'
    };
  }
};

module.exports = { sendMessage };