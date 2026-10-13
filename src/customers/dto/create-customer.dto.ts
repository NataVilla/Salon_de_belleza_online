import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { NormalizeEmail } from '../../common/decorators/normalize-email.decorator';
import { Trim } from '../../common/decorators/trim.decorator';

export class CreateCustomerDto {
  @Trim()
  @IsString({ message: 'El documento debe ser texto.' })
  @Matches(/^\d{1,20}$/, {
    message: 'El documento debe tener solo números (máximo 20).',
  })
  document: string;

  @Trim()
  @IsString({ message: 'El nombre debe ser texto.' })
  @IsNotEmpty({ message: 'El nombre es obligatorio.' })
  @MaxLength(255, { message: 'El nombre no puede tener más de 255 caracteres.' })
  name: string;

  @Trim()
  @IsString({ message: 'Los apellidos deben ser texto.' })
  @IsNotEmpty({ message: 'Los apellidos son obligatorios.' })
  @MaxLength(255, { message: 'Los apellidos no pueden tener más de 255 caracteres.' })
  lastName: string;

  @NormalizeEmail()
  @IsEmail({}, { message: 'El email no es válido.' })
  @MaxLength(255, { message: 'El email no puede tener más de 255 caracteres.' })
  email: string;

  @Trim()
  @IsString({ message: 'El celular debe ser texto.' })
  @Matches(/^\d{10}$/, { message: 'El celular debe tener 10 dígitos.' })
  phone: string;
}
