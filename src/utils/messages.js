const moment = require('moment');


const generateMessage = (text, username = 'Admin') => ({
    text,
    username,
    createdAt: moment().valueOf()
})

const generateLocationMessage = (url, username = 'Admin') => ({
    url,
    username,
    createdAt: moment().valueOf()
})


module.exports = {
    generateMessage,
    generateLocationMessage
}