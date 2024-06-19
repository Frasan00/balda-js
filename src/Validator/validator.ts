import vine from '@vinejs/vine';
import { SchemaTypes } from '@vinejs/vine/build/src/types';
import { VineCompileReturnType } from '../Server/Customization';

/**
 * @description - Creates a validator for a given schema
 * @param schemaBuilder - The schema builder function to create the schema
 * @returns - The compiled schema ready to be used
 */
export function createValidator<T extends SchemaTypes>(
  schemaBuilder: (vineInstance: typeof vine) => VineCompileReturnType<T>
): VineCompileReturnType<T> {
  return schemaBuilder(vine);
}
