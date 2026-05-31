import type { FC } from "react";

interface AvatarProps {
  userId?: string;
  avatarHash?: string;
  username?: string;
  className?: string;
  size?: number;
}

const getDefaultAvatar = (userId?: string) =>
  `/discord-cdn/embed/avatars/${userId ? Number(userId) % 5 : 0}.png`;

const Avatar: FC<AvatarProps> = ({
  userId,
  avatarHash,
  username,
  className = "w-10 h-10 rounded-full",
  size = 128,
}) => {
  const src =
    userId && avatarHash
      ? `/discord-cdn/avatars/${userId}/${avatarHash}.png?size=${size}`
      : getDefaultAvatar(userId);

  return (
    <img
      src={src}
      onError={(e) => {
        const fallback = getDefaultAvatar(userId);
        if (e.currentTarget.src !== fallback) {
          e.currentTarget.src = fallback;
        }
      }}
      alt={username ? `${username}'s avatar` : "User avatar"}
      className={className}
      loading="lazy"
    />
  );
};

export default Avatar;
