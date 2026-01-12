import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";

export class ReorderListDto {
    @ApiProperty({
        description: 'Nova ordem das listas (array de IDs)',
        example: ['uuid-1', 'uuid-2', 'uuid-3'],
        type: [String]
    })
    @IsNotEmpty({ message: 'Array de IDs é obrigatório' })
    listIds: string[];
}