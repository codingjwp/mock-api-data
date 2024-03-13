import jsonServer from 'json-server';
import { v4 as uuid } from 'uuid';
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node';
import bcypt from 'bcrypt';
import Joi from 'joi';
import fs from 'fs';

const INITALDB = {
  challengeImg: {
    list: [
      {
        id: 'challenge_img_01',
        imgSrc: '/assets/cooking.png',
        imgAlt: 'A man is cooking',
        type: 'cooking',
      },
      {
        id: 'challenge_img_02',
        imgSrc: '/assets/exercises.jpg',
        imgAlt: 'A woman is doing yoga',
        type: 'exercises',
      },
      {
        id: 'challenge_img_03',
        imgSrc: '/assets/investment.png',
        imgAlt: 'Money and graphs with a piggy bank',
        type: 'investment',
      },
      {
        id: 'challenge_img_04',
        imgSrc: '/assets/pets.png',
        imgAlt: 'Bunny holding a heart',
        type: 'pets',
      },
      {
        id: 'challenge_img_05',
        imgSrc: '/assets/programmers.png',
        imgAlt: 'A man programming ',
        type: 'programmers',
      },
      {
        id: 'challenge_img_06',
        imgSrc: '/assets/readings.png',
        imgAlt: 'Man reading, sitting on a book ',
        type: 'readings',
      },
      {
        id: 'challenge_img_07',
        imgSrc: '/assets/studys.png',
        imgAlt: 'Study room',
        type: 'studys',
      },
    ],
  },
  users: {
    info: [],
  },
  allChallenge: {
    challengeLength: 0,
    successLength: 0,
    failureLength: 0,
  },
};

const adapter = new JSONFile('db.json');
const db = new Low(adapter, INITALDB);
const file = fs.existsSync('db.json');

if (!file) {
  await db.write();
}
await db.read();

const { challengeImg, users, allChallenge } = db.data;

const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults({
  static: 'backend/',
});

server.use(middlewares);
server.use(jsonServer.bodyParser);

// login 부분
server.post('/signin', async (req, res, next) => {
  try {
    const { nick, password } = req.body;
    const signin = await validateLogin(nick, password, password);
    const data = users.info.filter((info) => info.nick == signin.nick);
    if (!data) {
      const { status, message } = errorMessage(400, "일치하는 닉네임이 없습니다.");
      res.status(400).send({ status, message });
      return;
    }
    let matchUserId = '';
    for (let i = 0; i < data.length; i++) {
      const match = await bcypt.compare(password, data[i].password);
      if (match) {
        matchUserId = data[i].userId;
        break;
      }
    }
    if (matchUserId === '') {
      const { status, message } = errorMessage(400, "비밀번호가 일치 하지 않습니다.");
      res.status(400).send({ status, message });
      return;
    }

    const limit = new Date().getTime() + 1000 * 60 * 60;
    const findedUser = users.info.find((item) => item.userId === matchUserId);
    findedUser.limitData = limit;
    await db.write();
    res.status(200).send({ userId: matchUserId, limitData: limit });
  } catch (error) {
    next(error);
  }
});

// signup 생성 부분
server.post('/signup', async (req, res, next) => {
  try {
    const { nick, password, confirm } = req.body;
    const isNick = users.info.find((user) => user.nick === nick);
    if (isNick) {
      const { status, message } = errorMessage(400, "이미 존재하는 닉네임 입니다.");
      res.status(400).send({ status, message });
      return;
    }
    const signup = await validateLogin(nick, password, confirm);
    // nickname과 페스워드같은 아이뒤가 존재할 경우 에러 발생
    const id = uuid();
    await db.update(({ users }) =>
      users.info.push({
        userId: id,
        nick: signup.nick,
        password: signup.password,
        limitData: 0,
        challengeLength: 0,
        successLength: 0,
        failureLength: 0,
        posts: [],
      })
    );
    res.status(200).send({ status: 200, data: { message: "회원가입을 성공하였습니다." } });
  } catch (error) {
    next(error);
  }
})

// posts 가져오기
server.get('/challenge', (req, res, next) => {
  try {
    const { status, userId } = req.query;
    const findedUser = users.info.find((item) => item.userId === userId);
    if (!findedUser) {
      const { status, message } = errorMessage(400, "해당 유저를 찾지 못했습니다.");
      res.status(400).send({ status, message });
      return;
    }
    const posts = findedUser.posts.filter((post) => post.status === status);

    res.status(200).send({
      challengeLength: findedUser.challengeLength,
      successLength: findedUser.successLength,
      failureLength: findedUser.failureLength,
      posts: posts
    });
  } catch (error) {
    next(error);
  }
})


// post 글 수정
server.post('/challenge/:id', async (req, res, next) => {
  try {
    const postId = req.params.id;
    const { userId, title, imgSrc, description, startDate, endDate } = req.body;
    const findedUser = users.info.find((item) => item.userId === userId);
    if (!findedUser) {
      const { status, message } = errorMessage(400, "해당 유저를 찾지 못했습니다.");
      res.status(400).send({ status, message });
      return;
    }
    const findedPost = findedUser.posts.find((post) => post.postId === postId);
    if (!findedPost) {
      const { status, message } = errorMessage(400, "해당 챌린지를 찾지 못했습니다.");
      res.status(400).send({ status, message });
      return;
    }
    findedPost.title = title;
    findedPost.imgSrc = imgSrc;
    findedPost.description = description;
    findedPost.startDate = startDate;
    findedPost.endDate = endDate;
    await db.write();
    res.status(200).send({ status: 200, data: { message: `챌린지 변경이 완료되었습니다.` } })
  } catch (error) {
    next(error);
  }
})

// post 성공 실패 수정
server.put('/challenge', async (req, res, next) => {
  try {
    const { userId, postId, status } = req.body;
    const findedUser = users.info.find((item) => item.userId === userId);
    if (!findedUser) {
      const { status, message } = errorMessage(400, "해당 유저를 찾지 못했습니다.");
      res.status(400).send({ status, message });
      return;
    }
    const findedPost = findedUser.posts.find((post) => post.postId === postId);
    if (!findedPost) {
      const { status, message } = errorMessage(400, "해당 챌린지를 찾지 못했습니다.");
      res.status(400).send({ status, message });
      return;
    }
    const postStatus = findedPost.status;
    if (postStatus === status) {
      const { status, message } = errorMessage(400, "동일한 챌린지 상태입니다.");
      res.status(400).send({ status, message });
      return;
    }
    if (postStatus === 'challenge') {
      findedUser.challengeLength -= 1;
      allChallenge.challengeLength -= 1;
    } else if (postStatus === 'success') {
      findedUser.successLength -= 1;
      allChallenge.successLength -= 1;
    } else {
      findedUser.failureLength -= 1;
      allChallenge.failureLength -= 1;
    }

    if (status === 'success') {
      findedUser.successLength += 1;
      allChallenge.successLength += 1;
    } else if (status === 'failure') {
      findedUser.failureLength += 1;
      allChallenge.failureLength += 1;
    }
    findedPost.status = status;
    await db.write();
    res.status(200).send({ status: 200, data: { message: `챌린지를 ${status}로 변경 완료되었습니다.` } })

  } catch (error) {
    next(error);
  }
})

// posts 생성
server.post('/challenge', async (req, res, next) => {
  try {
    const { userId, title, imgSrc, description, startDate, endDate } = req.body;
    const findedUser = users.info.find((item) => item.userId === userId);

    if (!findedUser) {
      const { status, message } = errorMessage(400, "해당 유저를 찾지 못했습니다.");
      res.status(400).send(status, message);
      return;
    }
    const postId = uuid();

    const newPosts = {
      postId: postId,
      title: title,
      imgSrc: imgSrc,
      description: description,
      startDate: startDate,
      endDate: endDate,
      status: 'challenge'
    };

    findedUser.posts.push(newPosts);
    findedUser.challengeLength += 1;
    allChallenge.challengeLength += 1;
    await db.write();
    res.status(200).send({ status: 200, data: { message: "챌린지를 등록이 완료되었습니다." } });
  } catch (error) {
    next(error)
  }
});

//post 삭제
server.delete('/challenge/:id', async (req, res, next) => {
  try {
    const postId = req.params.id;
    const { userId } = req.body;

    const findedUser = users.info.find((item) => item.userId === userId);
    if (!findedUser) {
      const { status, message } = errorMessage(400, "해당 유저를 찾지 못했습니다.");
      res.status(400).send({ status, message });
      return;
    }
    const findedPost = findedUser.posts.find((post) => post.postId === postId);
    if (!findedPost) {
      const { status, message } = errorMessage(400, "해당 챌린지를 찾지 못했습니다.");
      res.status(400).send({ status, message });
      return;
    }
    const findedStatus = findedPost.status;
    if (findedStatus === 'challenge') {
      findedUser.challengeLength -= 1;
      allChallenge.challengeLength -= 1;
    } else if (findedStatus === 'success') {
      findedUser.successLength -= 1;
      allChallenge.successLength -= 1;
    } else {
      findedUser.failureLength -= 1;
      allChallenge.failureLength -= 1;
    }
    const updatePost = findedUser.posts.filter((post) => post.postId !== postId);
    findedUser.posts = [...updatePost];
    await db.write();
    res.status(200).send({ status: 200, data: { message: "챌린지 삭제가 완료되었습니다." } });
  } catch (error) {
    next(error);
  }
})

// challenge image 가져오는 부분
server.get('/v2/image', (req, res, next) => {
  try {
    const { list } = challengeImg;
    return res.status(200).send({ list });
  } catch (error) {
    next(error);
  }
})

// dashboard 가져오기
server.get('/dashboard/:id', (req, res, next) => {
  try {
    const userId = req.params.id;
    const findedUser = users.info.find((item) => item.userId === userId);
    if (!findedUser) {
      const { status, message } = errorMessage(400, "해당 유저를 찾지 못했습니다.");
      res.status(400).send({ status, message });
      return;
    }

    const { list } = challengeImg;
    const imgList = list.reduce((acc, item) => {
      acc.push({ ...item, success: 0, failure: 0 })
      return acc;
    }, []);

    findedUser.posts.forEach((item) => {
      imgList.forEach((list) => {
        if (list.imgSrc === item.imgSrc && item.status !== 'challenge') {
          list[item.status] += 1;
        }
      })
    })
    const dashboardInfo = {
      nick: findedUser.nick,
      typeList: imgList,
      lengthList: {
        userChallengeLength: findedUser.challengeLength,
        userSuccessLength: findedUser.successLength,
        userFailureLength: findedUser.failureLength,
        allChallengeLength: allChallenge.challengeLength,
        allSuccessLength: allChallenge.successLength,
        allFailureLength: allChallenge.failureLength,

      }
    }
    res.status(200).send(dashboardInfo);
  } catch (error) {
    next(error);
  }
})

// 404 핸들러
server.use((req, res, next) => {
  res.status(404).send({ status: 404, message: '요청하신 페이지를 찾을 수 없습니다.' });
});


// 에러 넘김 부분
server.use((error, req, res, next) => {
  console.error(error);
  const { status, message } = errorMessage((error.status || 500), (error.message || '서버 내부 오류가 발생했습니다.'));
  res.status(status).send({ status, message });
});

server.use(router);
server.listen(8080, () => {
  console.log('Server is running on http:localhost:8080');
}).on('error', (e) => {
  console.error('서버를 시작하는 동안 오류가 발생했습니다:', e.message);
})

async function validateLogin(nick, password, confirm) {
  const schema = Joi.object({
    nick: Joi.string().alphanum().min(3).max(8).required(),
    password: Joi.string().min(8).max(20).pattern(new RegExp(/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[\W]).+$/)).required(),
    confirm: Joi.any().valid(Joi.ref('password')).required(),
  });
  try {
    const saltRounds = 10;
    const value = await schema.validateAsync({ nick, password, confirm });
    const hash = await bcypt.hash(value.password, saltRounds);
    return { nick: value.nick, password: hash };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error("닉네임과 비밀번호를 다시 한번 확인해주세요.");
    }
    throw error;
  }
}

function errorMessage(status, message) {
  return {
    status,
    message,
  };
}
