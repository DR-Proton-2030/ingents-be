import { SchemaDefinitionProperty, SchemaDefinitionType, Types } from "mongoose";

const requiredString: SchemaDefinitionProperty = {
	type: String,
	required: true
};

const optionalNullString: SchemaDefinitionProperty = {
	type: String,
	default: null
};

const requiredNumber: SchemaDefinitionProperty = {
	type: Number,
	required: true
};

const optionalNullNumber: SchemaDefinitionProperty = {
	type: Number,
	default: null
};

const optionalNullDate: SchemaDefinitionProperty = {
	type: Date,
	default: null
};

const requiredDate: SchemaDefinitionProperty = {
	type: Date,
	required: true
};

const optionalNullObjectId: SchemaDefinitionProperty = {
	type: Types.ObjectId,
	default: null
};

const requiredObjectId: SchemaDefinitionProperty = {
	type: Types.ObjectId,
	required: true
};

const optionalBoolean: SchemaDefinitionProperty = {
	type: Boolean,
	// required: false,
	default: false
};

const requiredBoolean: SchemaDefinitionProperty = {
	type: Boolean,
	required: false
};

const optionalNullObject: SchemaDefinitionProperty = {
	type: Object,
	default: null
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
	optionalNullObject
};

const SCHEMA_DEFINITION_PROPERTY = schemaDefintionProperty;
export default SCHEMA_DEFINITION_PROPERTY;
