const express = require('express');
const slackService = require('./slackService');

const router = express.Router();

router.post('/commands', slackService.handleCommand);
router.post('/interactions', slackService.handleInteraction);

module.exports = router;
