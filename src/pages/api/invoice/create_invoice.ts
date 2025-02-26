import type { NextApiRequest, NextApiResponse } from 'next';
import { ResponseData, CorsMiddleware, CorsMethod } from '..';
import { GenerateOrderIDByTime } from 'utils/number';
import { INVOICE_SOURCE_TYPE, ORDER_STATUS } from 'packages/constants';
import { PrismaClient } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  try {
    await CorsMiddleware(req, res, CorsMethod);

    switch (req.method) {
      case 'POST':
        const prisma = new PrismaClient();
        const userId = req.body.user_id;
        const storeId = req.body.store_id;
        const chainId = req.body.chain_id;
        const network = req.body.network;
        const amount = req.body.amount;
        const currency = req.body.currency;
        const crypto = req.body.crypto;
        const crypto_amount = req.body.crypto_amount;
        const rate = req.body.rate;
        const description = req.body.description;
        const buyerEmail = req.body.buyer_email;
        const metadata = req.body.metadata;
        const notificationUrl = req.body.notification_url;
        const notificationEmail = req.body.notification_email;

        const orderId = GenerateOrderIDByTime();

        const payment_setting = await prisma.payment_settings.findFirst({
          where: {
            user_id: userId,
            store_id: storeId,
            chain_id: chainId,
            network: network,
            status: 1,
          },
          select: {
            current_used_address_id: true,
            payment_expire: true,
          },
        });

        if (!payment_setting) {
          return res.status(200).json({
            message: 'something wrong',
            result: false,
            data: null,
          });
        }

        const address = await prisma.addresses.findFirst({
          where: {
            id: payment_setting.current_used_address_id,
          },
          select: {
            address: true,
          },
        });

        if (!address) {
          return res.status(200).json({
            message: 'something wrong',
            result: false,
            data: null,
          });
        }

        const paid = 2; // unpaid
        const orderStatus = ORDER_STATUS.Processing; // settled, invalid, expired, processing

        const now = new Date();
        const expirationDate = new Date(now.setMinutes(now.getMinutes() + payment_setting.payment_expire));
        // const expirationDate = now.getTime() + parseInt(paymentExpire) * 60 * 1000;
        const sourceType = INVOICE_SOURCE_TYPE.Invoice;

        const invoice = await prisma.invoices.create({
          data: {
            store_id: storeId,
            chain_id: chainId,
            network: network,
            order_id: orderId,
            source_type: sourceType,
            amount: amount,
            crypto: crypto,
            crypto_amount: crypto_amount,
            currency: currency,
            rate: rate,
            description: description,
            buyer_email: buyerEmail,
            destination_address: address.address,
            paid: paid,
            metadata: metadata,
            notification_url: notificationUrl,
            notification_email: notificationEmail,
            order_status: orderStatus,
            created_at: now,
            expiration_at: expirationDate,
            external_payment_id: 0,
            status: 1,
          },
        });

        if (!invoice) {
          return res.status(200).json({
            message: 'something wrong',
            result: false,
            data: null,
          });
        }

        // create event of invoice
        const invoice_events = await prisma.invoice_events.createMany({
          data: [
            {
              invoice_id: invoice.id,
              order_id: orderId,
              message: 'Creation of invoice starting',
              created_at: now,
              status: 1,
            },
            {
              invoice_id: invoice.id,
              order_id: orderId,
              message: `${crypto}_${currency}: The rating rule is coingecko(${crypto}_${currency})`,
              created_at: now,
              status: 1,
            },
            {
              invoice_id: invoice.id,
              order_id: orderId,
              message: `${crypto}_${currency}: The evaluated rating rule is ${rate}`,
              created_at: now,
              status: 1,
            },
            {
              invoice_id: invoice.id,
              order_id: orderId,
              message: `Invoice ${orderId} new event: invoice_created`,
              created_at: now,
              status: 1,
            },
          ],
        });

        if (!invoice_events) {
          return res.status(200).json({
            message: 'something wrong',
            result: false,
            data: null,
          });
        }

        return res.status(200).json({
          message: '',
          result: true,
          data: {
            order_id: orderId,
          },
        });

      default:
        throw 'no support the method of api';
    }
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: '', result: false, data: e });
  }
}
