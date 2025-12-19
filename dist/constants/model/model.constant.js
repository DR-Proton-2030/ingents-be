"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const requiredString = {
    type: String,
    required: true
};
const optionalNullString = {
    type: String,
    default: null
};
const requiredNumber = {
    type: Number,
    required: true
};
const optionalNullNumber = {
    type: Number,
    default: null
};
const optionalNullDate = {
    type: Date,
    default: null
};
const requiredDate = {
    type: Date,
    required: true
};
const optionalNullObjectId = {
    type: mongoose_1.Types.ObjectId,
    default: null
};
const requiredObjectId = {
    type: mongoose_1.Types.ObjectId,
    required: true
};
const optionalBoolean = {
    type: Boolean,
    // required: false,
    default: false
};
const requiredBoolean = {
    type: Boolean,
    required: false
};
const optionalNullObject = {
    type: Object,
    default: null
};
const optionalArray = {
    type: Array,
    default: []
};
const schemaDefintionProperty = {
    requiredString,
    optionalBoolean,
    requiredNumber,
    optionalNullNumber,
    optionalNullString,
    requiredDate,
    requiredObjectId,
    optionalNullDate,
    optionalNullObjectId,
    requiredBoolean,
    optionalNullObject,
    optionalArray
};
const SCHEMA_DEFINITION_PROPERTY = schemaDefintionProperty;
exports.default = SCHEMA_DEFINITION_PROPERTY;
