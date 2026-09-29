import { StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { AdminSupportController } from './admin-support.controller';

/**
 * Regression test for a real bug: a controller returning a raw Buffer here
 * goes through Nest's default JSON reply path (Express's res.json(), since
 * a Buffer is typeof 'object') and the download comes out as literal
 * `{"type":"Buffer","data":[...]}` text wearing an .xlsx content-type --
 * Excel (correctly) calls that corrupted. StreamableFile is the fix; these
 * tests fail if a future edit reverts to returning the Buffer directly.
 */
describe('AdminSupportController xlsx exports', () => {
  const reports = {
    studentsXlsx: jest.fn().mockResolvedValue(Buffer.from('students')),
    enrollmentsXlsx: jest.fn().mockResolvedValue(Buffer.from('enrollments')),
    attendanceXlsx: jest.fn().mockResolvedValue(Buffer.from('attendance')),
  };
  const controller = new AdminSupportController(
    {} as never,
    {} as never,
    reports as never,
  );

  function mockResponse(): Response {
    return { set: jest.fn() } as unknown as Response;
  }

  it('wraps the students export in a StreamableFile with .xlsx headers', async () => {
    const res = mockResponse();
    const result = await controller.studentsXlsx(res);

    expect(result).toBeInstanceOf(StreamableFile);
    expect(res.set).toHaveBeenCalledWith(
      expect.objectContaining({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="aiit-students.xlsx"',
      }),
    );
  });

  it('wraps the enrollments export in a StreamableFile', async () => {
    const result = await controller.enrollmentsXlsx(mockResponse());
    expect(result).toBeInstanceOf(StreamableFile);
  });

  it('wraps the attendance export in a StreamableFile', async () => {
    const result = await controller.attendanceXlsx({}, mockResponse());
    expect(result).toBeInstanceOf(StreamableFile);
  });
});
