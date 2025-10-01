import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { AppService } from './app.service';
import { AuthGuard } from '@nestjs/passport';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // This is a public route
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // This route is protected. It will only work if a valid JWT is provided.
  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  getProfile(@Req() req: { user: { userId: string; email: string } }): {
    userId: string;
    email: string;
  } {
    // Because of our JwtStrategy, req.user will be populated with { userId, email }
    return req.user;
  }
}
