import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { generateCharacterReply } from "./llm";

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(6000),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  chat: router({
    send: publicProcedure
      .input(
        z.object({
          characterName: z.string().min(1).max(120),
          persona: z.string().min(1).max(4000),
          history: z.array(chatMessageSchema).max(24),
          message: z.string().min(1).max(2000),
        })
      )
      .mutation(async ({ input }) => {
        const reply = await generateCharacterReply({
          name: input.characterName,
          persona: input.persona,
          history: input.history,
          message: input.message,
        });
        return { reply };
      }),
    privatePing: protectedProcedure.query(({ ctx }) => ({
      openId: ctx.user.openId,
      ready: true,
    })),
  }),
});

export type AppRouter = typeof appRouter;
