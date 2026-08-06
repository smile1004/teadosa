(function (window) {
  'use strict';

  function normalizeText(value) {
    return String(value || '').normalize('NFKC').trim();
  }

  function normalizeUsername(value) {
    return normalizeText(value).toLowerCase();
  }

  function normalizeEmail(value) {
    return normalizeText(value).toLowerCase();
  }

  function digits(value) {
    return String(value || '').replace(/\D/g, '');
  }

  function isValidUsername(value) {
    return /^[a-zA-Z0-9_-]{6,20}$/.test(normalizeUsername(value));
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
  }

  function isValidPassword(value) {
    const password = String(value || '');
    return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
  }

  function isValidBusinessNumber(value) {
    const number = digits(value);
    if (!/^\d{10}$/.test(number)) return false;
    const numbers = number.split('').map(Number);
    const weights = [1, 3, 7, 1, 3, 7, 1, 3];
    let sum = weights.reduce(function (total, weight, index) {
      return total + numbers[index] * weight;
    }, 0);
    const ninth = numbers[8] * 5;
    sum += Math.floor(ninth / 10) + (ninth % 10);
    return ((10 - (sum % 10)) % 10) === numbers[9];
  }

  window.TaeDoSAValidation = Object.freeze({
    normalizeText: normalizeText,
    normalizeUsername: normalizeUsername,
    normalizeEmail: normalizeEmail,
    digits: digits,
    isValidUsername: isValidUsername,
    isValidEmail: isValidEmail,
    isValidPassword: isValidPassword,
    isValidBusinessNumber: isValidBusinessNumber
  });
})(window);
