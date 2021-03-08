import express = require('express');

export interface MessageEventNotification {
    type: number,
    sender?: string,
    content: any,
    res?: express.Response
}