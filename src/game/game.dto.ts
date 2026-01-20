import {
  IsString,
  IsNumber,
  IsIn,
  Length,
  Matches,
} from 'class-validator';

/** DTO for player join event */
export class JoinGameDto {
  @IsString()
  @Length(2, 16)
  @Matches(/^[a-zA-Z0-9_\-\s\u00C0-\u024F]+$/, {
    message:
      'Nickname pode conter apenas letras, números, espaços, _ e -',
  })
  nickname: string;
}

export class MovePayloadDto {
  @IsIn(['up', 'down', 'left', 'right'])
  direction: 'up' | 'down' | 'left' | 'right';
}

export class ShootPayloadDto {
  @IsNumber()
  angle: number;
}

export class AimPayloadDto {
  @IsNumber()
  angle: number;
}
