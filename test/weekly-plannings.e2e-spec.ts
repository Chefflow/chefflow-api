import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import cookieParser from 'cookie-parser';

// Type definitions for API responses
interface UserResponse {
  id: number;
  username: string;
  email: string;
  name: string | null;
  image: string | null;
  provider: string;
  slotsPerDay: number;
  createdAt: string;
  updatedAt: string;
}

interface RecipeResponse {
  id: number;
  userId: number;
  title: string;
  description: string | null;
  servings: number;
  prepTime: number | null;
  cookTime: number | null;
  imageUrl: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface SlotRecipeResponse {
  id: number;
  slotId: number;
  recipeId: number;
  position: number;
  addedAt: string;
  recipe?: RecipeResponse;
}

interface WeeklyPlanningSlotResponse {
  id: number;
  weeklyPlanningId: number;
  dayOfWeek: string;
  slotNumber: number;
  recipes: SlotRecipeResponse[];
  createdAt: string;
  updatedAt: string;
}

interface WeeklyPlanningResponse {
  id: number;
  userId: number;
  weekStart: string;
  weekEnd: string;
  slotsPerDay: number;
  slots: WeeklyPlanningSlotResponse[];
  createdAt: string;
  updatedAt: string;
}

interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  code?: string;
  error?: string;
}

describe('WeeklyPlannings (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let userCookies: string[];
  let otherUserCookies: string[];

  let username1: string;
  let username2: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    prisma = app.get<PrismaService>(PrismaService);
    await app.init();

    // Create test users
    const hashedPass =
      'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3';
    const timestamp = Date.now();
    username1 = `user${timestamp}`;
    username2 = `user2${timestamp}`;

    // Register and login user 1
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        username: username1,
        email: `${username1}@test.com`,
        password: hashedPass,
        name: 'User 1',
      });

    const res1 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: username1, password: hashedPass });
    userCookies = (res1.headers['set-cookie'] ?? []) as unknown;

    // Register and login user 2
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        username: username2,
        email: `${username2}@test.com`,
        password: hashedPass,
        name: 'User 2',
      });

    const res2 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: username2, password: hashedPass });
    otherUserCookies = (res2.headers['set-cookie'] ?? []) as unknown;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.weeklyPlanningSlotRecipe.deleteMany();
    await prisma.weeklyPlanningSlot.deleteMany();
    await prisma.weeklyPlanning.deleteMany();
    await prisma.recipe.deleteMany();
    await prisma.user.updateMany({ data: { slotsPerDay: 3 } });
  });

  function cookiesToHeader(cookies: string[]): string {
    return cookies.map((c) => c.split(';')[0]).join('; ');
  }

  function body<T>(response: request.Response): T {
    return response.body as T;
  }

  it('should get user with default slotsPerDay=3', async () => {
    const res = await request(app.getHttpServer())
      .get('/users/me')
      .set('Cookie', cookiesToHeader(userCookies));
    expect(res.status).toBe(200);
    const user = body<UserResponse>(res);
    expect(user.slotsPerDay).toBe(3);
  });

  it('should update slotsPerDay and create planning with snapshot', async () => {
    // Create recipe (id not used here, only ensures route works)
    const recipeRes = await request(app.getHttpServer())
      .post('/recipes')
      .set('Cookie', cookiesToHeader(userCookies))
      .send({
        title: 'Test Recipe',
        servings: 4,
        prepTime: 10,
        cookTime: 20,
        ingredients: [{ ingredientName: 'Test', quantity: 1, unit: 'UNIT' }],
      });
    expect(recipeRes.status).toBe(201);

    // Update user to 5 slots
    const updateRes = await request(app.getHttpServer())
      .patch(`/users/${username1}`)
      .set('Cookie', cookiesToHeader(userCookies))
      .send({ slotsPerDay: 5 });
    expect(updateRes.status).toBe(200);

    // Create planning
    const planningRes = await request(app.getHttpServer())
      .post('/weekly-plannings')
      .set('Cookie', cookiesToHeader(userCookies))
      .send({ weekStart: '2026-05-11' });
    expect(planningRes.status).toBe(201);
    const planning = body<WeeklyPlanningResponse>(planningRes);
    expect(planning.slotsPerDay).toBe(5);

    // Reduce user slots to 3
    await request(app.getHttpServer())
      .patch(`/users/${username1}`)
      .set('Cookie', cookiesToHeader(userCookies))
      .send({ slotsPerDay: 3 });

    // Planning snapshot should still be 5
    const getRes = await request(app.getHttpServer())
      .get(`/weekly-plannings/${planning.id}`)
      .set('Cookie', cookiesToHeader(userCookies));
    expect(getRes.status).toBe(200);
    expect(body<WeeklyPlanningResponse>(getRes).slotsPerDay).toBe(5);
  });

  it('should add recipe to slot and handle duplicates', async () => {
    const recipeRes = await request(app.getHttpServer())
      .post('/recipes')
      .set('Cookie', cookiesToHeader(userCookies))
      .send({
        title: 'Pasta',
        servings: 4,
        prepTime: 10,
        ingredients: [{ ingredientName: 'Test', quantity: 1, unit: 'UNIT' }],
      });
    const recipeId = body<RecipeResponse>(recipeRes).id;

    const planningRes = await request(app.getHttpServer())
      .post('/weekly-plannings')
      .set('Cookie', cookiesToHeader(userCookies))
      .send({ weekStart: '2026-05-18' });
    const planningId = body<WeeklyPlanningResponse>(planningRes).id;

    // Add recipe
    const addRes = await request(app.getHttpServer())
      .post(`/weekly-plannings/${planningId}/slots/MONDAY/1/recipes`)
      .set('Cookie', cookiesToHeader(userCookies))
      .send({ recipeId });
    expect(addRes.status).toBe(201);
    expect(body<WeeklyPlanningSlotResponse>(addRes).recipes).toHaveLength(1);

    // Duplicate should be 409
    const dupRes = await request(app.getHttpServer())
      .post(`/weekly-plannings/${planningId}/slots/MONDAY/1/recipes`)
      .set('Cookie', cookiesToHeader(userCookies))
      .send({ recipeId });
    expect(dupRes.status).toBe(409);
    expect(body<ErrorResponse>(dupRes).code).toBe('RECIPE_DUPLICATE');
  });

  it('should validate slot out of range and full', async () => {
    const recipes: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await request(app.getHttpServer())
        .post('/recipes')
        .set('Cookie', cookiesToHeader(userCookies))
        .send({
          title: `Recipe${i}`,
          servings: 4,
          prepTime: 10,
          ingredients: [{ ingredientName: 'Test', quantity: 1, unit: 'UNIT' }],
        });
      recipes.push(body<RecipeResponse>(res).id);
    }

    const planningRes = await request(app.getHttpServer())
      .post('/weekly-plannings')
      .set('Cookie', cookiesToHeader(userCookies))
      .send({ weekStart: '2026-05-25' });
    const planningId = body<WeeklyPlanningResponse>(planningRes).id;

    // Slot 6 out of range (default slotsPerDay=3)
    const outRes = await request(app.getHttpServer())
      .post(`/weekly-plannings/${planningId}/slots/MONDAY/6/recipes`)
      .set('Cookie', cookiesToHeader(userCookies))
      .send({ recipeId: recipes[0] });
    expect(outRes.status).toBe(400);
    expect(body<ErrorResponse>(outRes).code).toBe('SLOT_OUT_OF_RANGE');

    // Fill slot with 5 recipes
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post(`/weekly-plannings/${planningId}/slots/MONDAY/1/recipes`)
        .set('Cookie', cookiesToHeader(userCookies))
        .send({ recipeId: recipes[i] });
    }

    // 6th should be SLOT_FULL
    const fullRes = await request(app.getHttpServer())
      .post(`/weekly-plannings/${planningId}/slots/MONDAY/1/recipes`)
      .set('Cookie', cookiesToHeader(userCookies))
      .send({ recipeId: recipes[5] });
    expect(fullRes.status).toBe(400);
    expect(body<ErrorResponse>(fullRes).code).toBe('SLOT_FULL');
  });

  it('should delete recipe from slot and keep empty slot', async () => {
    const r1Res = await request(app.getHttpServer())
      .post('/recipes')
      .set('Cookie', cookiesToHeader(userCookies))
      .send({
        title: 'R1',
        servings: 4,
        prepTime: 10,
        ingredients: [{ ingredientName: 'Test', quantity: 1, unit: 'UNIT' }],
      });
    const r1 = body<RecipeResponse>(r1Res).id;

    const r2Res = await request(app.getHttpServer())
      .post('/recipes')
      .set('Cookie', cookiesToHeader(userCookies))
      .send({
        title: 'R2',
        servings: 4,
        prepTime: 10,
        ingredients: [{ ingredientName: 'Test', quantity: 1, unit: 'UNIT' }],
      });
    const r2 = body<RecipeResponse>(r2Res).id;

    const planningRes = await request(app.getHttpServer())
      .post('/weekly-plannings')
      .set('Cookie', cookiesToHeader(userCookies))
      .send({ weekStart: '2026-06-01' });
    const planningId = body<WeeklyPlanningResponse>(planningRes).id;

    // Add 2 recipes
    await request(app.getHttpServer())
      .post(`/weekly-plannings/${planningId}/slots/MONDAY/1/recipes`)
      .set('Cookie', cookiesToHeader(userCookies))
      .send({ recipeId: r1 });

    await request(app.getHttpServer())
      .post(`/weekly-plannings/${planningId}/slots/MONDAY/1/recipes`)
      .set('Cookie', cookiesToHeader(userCookies))
      .send({ recipeId: r2 });

    // Delete r1
    const delRes = await request(app.getHttpServer())
      .delete(`/weekly-plannings/${planningId}/slots/MONDAY/1/recipes/${r1}`)
      .set('Cookie', cookiesToHeader(userCookies));
    expect(delRes.status).toBe(204);

    // Slot should have 1 recipe
    const getRes = await request(app.getHttpServer())
      .get(`/weekly-plannings/${planningId}`)
      .set('Cookie', cookiesToHeader(userCookies));
    const slot = body<WeeklyPlanningResponse>(getRes).slots[0];
    expect(slot.recipes).toHaveLength(1);
    expect(slot.recipes[0].id).toBe(r2);

    // Delete r2
    await request(app.getHttpServer())
      .delete(`/weekly-plannings/${planningId}/slots/MONDAY/1/recipes/${r2}`)
      .set('Cookie', cookiesToHeader(userCookies));

    // Slot should exist but be empty
    const getRes2 = await request(app.getHttpServer())
      .get(`/weekly-plannings/${planningId}`)
      .set('Cookie', cookiesToHeader(userCookies));
    const slot2 = body<WeeklyPlanningResponse>(getRes2).slots[0];
    expect(slot2).toBeDefined();
    expect(slot2.recipes).toHaveLength(0);

    // Delete entire slot
    await request(app.getHttpServer())
      .delete(`/weekly-plannings/${planningId}/slots/MONDAY/1`)
      .set('Cookie', cookiesToHeader(userCookies));

    // Slot should be gone
    const getRes3 = await request(app.getHttpServer())
      .get(`/weekly-plannings/${planningId}`)
      .set('Cookie', cookiesToHeader(userCookies));
    expect(body<WeeklyPlanningResponse>(getRes3).slots).toHaveLength(0);
  });

  it('should validate ownership', async () => {
    const recipeRes = await request(app.getHttpServer())
      .post('/recipes')
      .set('Cookie', cookiesToHeader(userCookies))
      .send({
        title: 'MyRecipe',
        servings: 4,
        prepTime: 10,
        ingredients: [{ ingredientName: 'Test', quantity: 1, unit: 'UNIT' }],
      });
    const recipeId = body<RecipeResponse>(recipeRes).id;

    const planningRes = await request(app.getHttpServer())
      .post('/weekly-plannings')
      .set('Cookie', cookiesToHeader(userCookies))
      .send({ weekStart: '2026-06-08' });
    const planningId = body<WeeklyPlanningResponse>(planningRes).id;

    // Other user cannot access planning
    const accessRes = await request(app.getHttpServer())
      .get(`/weekly-plannings/${planningId}`)
      .set('Cookie', cookiesToHeader(otherUserCookies));
    expect(accessRes.status).toBe(404);

    // Other user cannot add another user's recipe
    const otherPlanningRes = await request(app.getHttpServer())
      .post('/weekly-plannings')
      .set('Cookie', cookiesToHeader(otherUserCookies))
      .send({ weekStart: '2026-06-08' });
    const otherPlanningId = body<WeeklyPlanningResponse>(otherPlanningRes).id;

    const addRes = await request(app.getHttpServer())
      .post(`/weekly-plannings/${otherPlanningId}/slots/MONDAY/1/recipes`)
      .set('Cookie', cookiesToHeader(otherUserCookies))
      .send({ recipeId });
    expect(addRes.status).toBe(404);
  });

  it('should validate slotsPerDay range', async () => {
    // 0 invalid
    const res0 = await request(app.getHttpServer())
      .patch(`/users/${username1}`)
      .set('Cookie', cookiesToHeader(userCookies))
      .send({ slotsPerDay: 0 });
    expect(res0.status).toBe(400);

    // 7 invalid
    const res7 = await request(app.getHttpServer())
      .patch(`/users/${username1}`)
      .set('Cookie', cookiesToHeader(userCookies))
      .send({ slotsPerDay: 7 });
    expect(res7.status).toBe(400);

    // 1-6 valid
    for (let i = 1; i <= 6; i++) {
      const res = await request(app.getHttpServer())
        .patch(`/users/${username1}`)
        .set('Cookie', cookiesToHeader(userCookies))
        .send({ slotsPerDay: i });
      expect(res.status).toBe(200);
      expect(body<UserResponse>(res).slotsPerDay).toBe(i);
    }
  });
});
