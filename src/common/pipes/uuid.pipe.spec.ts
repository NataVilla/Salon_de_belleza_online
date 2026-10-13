import { BadRequestException } from '@nestjs/common';
import { UuidPipe } from './uuid.pipe';

describe('UuidPipe', () => {
  const metadata = { type: 'param' as const, data: 'id' };

  it('deja pasar un UUID válido', async () => {
    const id = '060968ee-62bc-425f-be3e-10bc0d73222e';
    await expect(UuidPipe.transform(id, metadata)).resolves.toBe(id);
  });

  it.each(['no-es-uuid', '123', ''])('responde 400 en español con %p', async (value) => {
    await expect(UuidPipe.transform(value, metadata)).rejects.toThrow(
      new BadRequestException('El id debe ser un UUID válido.'),
    );
  });
});
