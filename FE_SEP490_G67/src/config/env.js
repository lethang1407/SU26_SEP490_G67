import * as z from 'zod';

const createEnv = () => {
  const EnvSchema = z.object({
    API_URL: z.string(),
    ENABLE_API_MOCKING: z
      .string()
      .refine((s) => s === 'true' || s === 'false')
      .transform((s) => s === 'true')
      .optional(),
    APP_URL: z.string().optional().default('http://localhost:3000'),
    APP_MOCK_API_PORT: z.string().optional().default('8080'),
    ENABLE_AUTO_REDIRECT_LOGIN: z
      .string()
      .refine((s) => s === 'true' || s === 'false')
      .transform((s) => s === 'true')
      .optional()
      .default('false'), // Mặc định tắt trong dev
    /** Cloudinary cloud name — dùng unsigned upload từ FE. */
    CLOUDINARY_CLOUD_NAME: z.string().optional().default(''),
    /** Upload preset unsigned (Settings → Upload → Upload presets). */
    CLOUDINARY_UPLOAD_PRESET: z.string().optional().default(''),
  });

  const envVars = Object.entries(import.meta.env).reduce(
    (acc, curr) => {
      const [key, value] = curr;
      if (key.startsWith('VITE_APP_')) {
        acc[key.replace('VITE_APP_', '')] = value;
      }
      return acc;
    },
    {}
  );

  const parsedEnv = EnvSchema.safeParse(envVars);

  if (!parsedEnv.success) {
    throw new Error(
      `Invalid env provided.
The following variables are missing or invalid:
${Object.entries(parsedEnv.error.flatten().fieldErrors)
  .map(([k, v]) => `- ${k}: ${v}`)
  .join('\n')}
`
    );
  }

  return parsedEnv.data;
};

export const env = createEnv();