const validatePhone = (phone) => {
  const regex = /^(?:\+254|0)[17]\d{8}$/;
  return regex.test(phone);
};

const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

module.exports = { validatePhone, validateEmail };