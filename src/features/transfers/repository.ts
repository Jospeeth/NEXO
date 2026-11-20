import { randomUUID } from 'expo-crypto';
import { database } from '../../infrastructure/storage/database';
import { writeTransfer, type TransferInput } from './write-transfer';

export async function createTransfer(input: TransferInput) {
  writeTransfer(await database(), input, randomUUID(), new Date().toISOString());
}
