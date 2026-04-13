import { model } from "mongoose";
import todoSchema from "./todo.schema";
import { ITodo } from "../../types/interface/todo.interface";

const TodoModel = model<ITodo>("todos", todoSchema);
export default TodoModel;
