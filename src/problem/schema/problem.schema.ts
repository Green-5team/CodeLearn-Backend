import { Schema, Prop, SchemaFactory } from "@nestjs/mongoose"
import { IsNotEmpty, IsString, IsArray, IsNumber } from 'class-validator';
import { Document } from "mongoose";


@Schema()
export class Problem extends Document {
    
    @Prop()
    @IsNumber()
    problem_number: number;

    @Prop()
    @IsNotEmpty()
    prolbem_level: number;

    @Prop()
    @IsString()
    @IsNotEmpty()
    problem_title: string;

    @Prop()
    @IsString()
    problem_ex_input: string;

    @Prop()
    @IsString()
    problem_ex_output: string;

    @Prop()
    @IsArray()
    problem_input: string[];

    @Prop()
    @IsArray()
    problem_output: string[];

}

export const PorblemSchema  = SchemaFactory.createForClass(Problem);