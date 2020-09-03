/*
Copyright 2016 Balena.io

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

/**
 * @module imagefs
 */

import * as ext2fs from 'ext2fs';
import * as fatfs from 'fatfs';
import * as Fs from 'fs';
import { Disk, FileDisk, withOpenFile } from 'file-disk';
import * as partitioninfo from 'partitioninfo';
import { TypedError } from 'typed-error';
import { promisify } from 'util';

class MountError extends TypedError {}

const SECTOR_SIZE = 512;

async function runInFat<T>(
	disk: Disk,
	offset: number,
	size: number,
	fn: (fs: typeof Fs) => Promise<T>,
): Promise<T> {
	function sectorPosition(sector: number) {
		return offset + sector * SECTOR_SIZE;
	}
	const fat = fatfs.createFileSystem({
		sectorSize: SECTOR_SIZE,
		numSectors: size / SECTOR_SIZE,
		readSectors: async (
			sector: number,
			dest: Buffer,
			callback: (
				error: Error | null,
				bytesRead?: number,
				buffer?: Buffer,
			) => void,
		): Promise<void> => {
			try {
				const { bytesRead, buffer } = await disk.read(
					dest,
					0,
					dest.length,
					sectorPosition(sector),
				);
				callback(null, bytesRead, buffer);
			} catch (e) {
				callback(e);
			}
		},
		writeSectors: async (
			sector: number,
			data: Buffer,
			callback: (
				error: Error | null,
				bytesWritten?: number,
				buffer?: Buffer,
			) => void,
		): Promise<void> => {
			try {
				const { bytesWritten, buffer } = await disk.write(
					data,
					0,
					data.length,
					sectorPosition(sector),
				);
				callback(null, bytesWritten, buffer);
			} catch (e) {
				callback(e);
			}
		},
	});
	await new Promise(function (resolve, reject) {
		fat.on('error', (e: Error) => {
			reject(new MountError(e));
		});
		fat.on('ready', resolve);
	});
	return await fn(fat);
}

const mountAsync = promisify(ext2fs.mount);
const umountAsync = promisify(ext2fs.umount);

async function runInExt<T>(
	disk: Disk,
	offset: number,
	fn: (fs: typeof Fs) => Promise<T>,
): Promise<T> {
	let fs: typeof Fs;
	try {
		fs = await mountAsync(disk, { offset });
	} catch (e) {
		throw new MountError(e);
	}
	try {
		return await fn(fs);
	} finally {
		await umountAsync(fs);
	}
}

async function tryInteract<T>(
	disk: Disk,
	offset: number,
	size: number,
	fn: (fs: typeof Fs) => Promise<T>,
): Promise<T> {
	try {
		return await runInExt(disk, offset, fn);
	} catch (e) {
		if (!(e instanceof MountError)) {
			throw e;
		}
		try {
			return await runInFat(disk, offset, size, fn);
		} catch (e2) {
			if (!(e2 instanceof MountError)) {
				throw e2;
			}
			throw new Error('Unsupported filesystem.');
		}
	}
}

async function getPartitionOffset(disk: Disk, partition?: number) {
	if (partition === undefined) {
		const size = await disk.getCapacity();
		return { offset: 0, size };
	} else {
		return await partitioninfo.get(disk, partition);
	}
}

async function diskInteract<T>(
	disk: Disk,
	partition: number | undefined,
	fn: (fs: typeof Fs) => Promise<T>,
): Promise<T> {
	const { offset, size } = await getPartitionOffset(disk, partition);
	return await tryInteract(disk, offset, size, fn);
}

/**
 * @summary Run a function with a node fs like interface for a partition
 *
 * @example
 *
 * const contents = await interact('/foo/bar.img', 5, async (fs) => {
 * 	return await promisify(fs.readFile)('/bar/qux');
 * });
 * console.log(contents);
 *
 */
export async function interact<T>(
	disk: Disk | string,
	partition: number | undefined,
	fn: (fs: typeof Fs) => Promise<T>,
): Promise<T> {
	if (typeof disk === 'string') {
		return await withOpenFile(disk, 'r+', async (handle) => {
			disk = new FileDisk(handle);
			return await diskInteract(disk, partition, fn);
		});
	} else if (disk instanceof Disk) {
		return await diskInteract(disk, partition, fn);
	} else {
		throw new Error('image must be a String (file path) or a Disk instance');
	}
}
