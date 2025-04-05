
require('dotenv').config();
const { WebClient } = require('@slack/web-api');

const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);

// Slash command handler
exports.handleCommand = async (req, res) => {
    const { command, trigger_id } = req.body;

    if (command === '/approval-test') {
        const modal = {
            trigger_id,
            view: {
                type: 'modal',
                callback_id: 'approval_modal',
                title: { type: 'plain_text', text: 'Approval Request' },
                blocks: [
                    {
                        type: 'input',
                        block_id: 'approver_block',
                        element: {
                            type: 'users_select',
                            action_id: 'approver',
                            placeholder: { type: 'plain_text', text: 'Select Approver' }
                        },
                        label: { type: 'plain_text', text: 'Approver' }
                    },
                    {
                        type: 'input',
                        block_id: 'approval_text_block',
                        element: {
                            type: 'plain_text_input',
                            action_id: 'approval_text'
                        },
                        label: { type: 'plain_text', text: 'Approval Text' }
                    }
                ],
                submit: { type: 'plain_text', text: 'Submit' }
            }
        };

        await slackClient.views.open(modal);
        return res.status(200).send();
    }
    return res.status(400).send('Invalid Command');
};

// Interaction handler
exports.handleInteraction = async (req, res) => {
    const payload = JSON.parse(req.body.payload);

    // When modal is submitted
    if (payload.type === 'view_submission' && payload.view.callback_id === 'approval_modal') {
        const approver = payload.view.state.values.approver_block.approver.selected_user;
        const approvalText = payload.view.state.values.approval_text_block.approval_text.value;
        const requester = payload.user.id;

        await slackClient.chat.postMessage({
            channel: approver,
            text: `Approval request from <@${requester}>:\n\n"${approvalText}"`,
            blocks: [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `Approval request from <@${requester}>:\n\n"${approvalText}"`
                    }
                },
                {
                    type: 'actions',
                    block_id: 'approval_action_block',
                    elements: [
                        {
                            type: 'button',
                            text: { type: 'plain_text', text: 'Approve ✅' },
                            style: 'primary',
                            value: JSON.stringify({ action: 'approve', requester })
                        },
                        {
                            type: 'button',
                            text: { type: 'plain_text', text: 'Reject ❌' },
                            style: 'danger',
                            value: JSON.stringify({ action: 'reject', requester })
                        }
                    ]
                }
            ]
        });

        return res.status(200).send();
    }

    // When button is clicked
    if (payload.type === 'block_actions' && payload.actions[0]) {
        const { action, requester } = JSON.parse(payload.actions[0].value);
        const approver = payload.user.id;

        const responseText = action === 'approve'
            ? `✅ Your request was approved by <@${approver}>`
            : `❌ Your request was rejected by <@${approver}>`;

        await slackClient.chat.postMessage({
            channel: requester,
            text: responseText
        });

        return res.status(200).send();
    }

    return res.status(400).send();
};
