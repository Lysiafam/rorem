import type { NextApiRequest, NextApiResponse } from 'next';
import { ResponseData, CorsMiddleware, CorsMethod } from '..';
import { PrismaClient } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  try {
    await CorsMiddleware(req, res, CorsMethod);

    switch (req.method) {
      case 'GET':
        const prisma = new PrismaClient();
        const email = req.query.email;

        const user = await prisma.users.findFirst({
          where: {
            email: String(email),
            status: 1,
          },
          select: {
            username: true,
            email: true,
            profile_picture_url: true,
          },
        });

        if (!user) {
          return res.status(200).json({ message: '', result: false, data: null });
        }

        // todo: send reset email

        return res.status(200).json({ message: '', result: true, data: null });

      case 'POST':
        break;
      default:
        throw 'no support the method of api';
    }
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: '', result: false, data: e });
  }
}
