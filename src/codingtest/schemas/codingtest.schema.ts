import { Schema, Prop, SchemaFactory } from "@nestjs/mongoose"
import { IsNotEmpty, IsString, IsArray, IsNumber } from 'class-validator';
import { Document } from "mongoose";

@Schema()
export class Problem extends Document {
    @Prop()
    @IsNumber()
    number: number;

    @Prop()
    @IsNumber()
    @IsNotEmpty()
    level: number;

    @Prop()
    @IsString()
    @IsNotEmpty()
    title: string;

    @Prop()
    @IsString()
    @IsNotEmpty()
    contents: string;

    @Prop()
    @IsString()
    @IsNotEmpty()
    input_contents: string;
    
    
    @Prop()
    @IsString()
    @IsNotEmpty()
    output_contents: string;

    @Prop()
    @IsArray()
    ex_input: string[];

    @Prop()
    @IsArray()
    ex_output: string[];

    @Prop()
    @IsArray()
    input: string[];

    @Prop()
    @IsArray()
    output: string[];
}
export const ProblemSchema = SchemaFactory.createForClass(Problem);

/*{
    "output": "hello",
    "statusCode": 200,
    "memory": "8176",
    "cpuTime": "0.00",
    "compilationStatus": null
}*/