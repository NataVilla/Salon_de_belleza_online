import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { NormalizeEmail } from '../../common/decorators/normalize-email.decorator';
import { Trim } from '../../common/decorators/trim.decorator';

export class CreateUserDto {
  @Trim()
  @IsString({ message: 'El nombre debe ser texto.' })
  @IsNotEmpty({ message: 'El nombre es obligatorio.' })
  @MaxLength(255, { message: 'El nombre no puede tener más de 255 caracteres.' })
  name: string;

  @NormalizeEmail()
  @IsEmail({}, { message: 'El email no es válido.' })
  @MaxLength(255, { message: 'El email no puede tener más de 255 caracteres.' })
  email: string;

  // Sin @Trim: los espacios de la contraseña son parte de ella.
  // bcrypt solo usa los primeros 72 bytes, por eso el máximo.
  @IsString({ message: 'La contraseña debe ser texto.' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  @MaxLength(72, { message: 'La contraseña no puede tener más de 72 caracteres.' })
  password: string;
}
